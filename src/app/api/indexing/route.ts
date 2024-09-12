import { db } from "@vercel/postgres";
import { encodingForModel } from "js-tiktoken";
import Together from "together-ai";

export const maxDuration = 60;

const together = new Together({
  apiKey: process.env.TOGETHER_API_KEY,
});

const MAX_TOKENS = 250;
const encoder = encodingForModel("gpt-3.5-turbo");

export async function POST(request: Request) {
  const client = await db.connect();
  let processedIds: number[] = [];

  try {
    const result = await client.query(`
      UPDATE scraping_url
      SET indexing_status = 'PROCESSING'
      WHERE id IN (
        SELECT id
        FROM scraping_url
        WHERE indexing_status = 'QUEUED'
        ORDER BY RANDOM()
        LIMIT 20
        FOR UPDATE SKIP LOCKED
      )
      RETURNING id, url, content, scraping_run_id
    `);

    if (result.rows.length === 0) {
      return new Response("No URLs to process", { status: 200 });
    }

    const documents = result.rows;
    const allChunks: { id: number; chunk: string; data_source_id: string }[] =
      [];

    for (const doc of documents) {
      const { id, url, content, scraping_run_id } = doc;

      try {
        // Get data_source_id
        const dataSourceResult = await client.query(
          `SELECT data_source_id FROM scraping_run WHERE id = $1`,
          [scraping_run_id]
        );
        const data_source_id = dataSourceResult.rows[0].data_source_id;

        // Split content into chunks
        const chunks = splitTextIntoChunks(content, MAX_TOKENS);

        // Add chunks to allChunks array
        allChunks.push(
          ...chunks.map((chunk) => ({ id, chunk, data_source_id }))
        );
      } catch (error) {
        await client.query(
          `UPDATE scraping_url SET indexing_status = 'QUEUED' WHERE id = $1`,
          [id]
        );
      }
    }

    // Process all chunks in batches
    const embeddings = await getEmbeddings(allChunks);

    if (embeddings === null) {
      throw new Error("Failed to get embeddings");
    }

    // Update database for each document
    for (const doc of documents) {
      const { id, url, content } = doc;
      const docEmbeddings = embeddings.filter((e) => e.id === id);

      if (docEmbeddings.length > 0) {
        const finalEmbedding = averageEmbeddings(
          docEmbeddings.map((e) => e.embedding)
        );
        await updateDatabase(
          client,
          id,
          url,
          content,
          finalEmbedding,
          docEmbeddings[0].data_source_id
        );
        processedIds.push(id);
      }
    }

    // Set remaining documents back to QUEUED
    const remainingIds = documents
      .map((doc) => doc.id)
      .filter((id) => !processedIds.includes(id));
    if (remainingIds.length > 0) {
      await client.query(
        `UPDATE scraping_url SET indexing_status = 'QUEUED' WHERE id = ANY($1)`,
        [remainingIds]
      );
    }

    return new Response(
      `Indexing completed for ${processedIds.length} documents`,
      { status: 200 }
    );
  } catch (error) {
    return new Response("Error in indexing process", { status: 500 });
  } finally {
    client.release();
  }
}

async function getEmbeddings(
  chunks: { id: number; chunk: string; data_source_id: string }[]
): Promise<
  { id: number; embedding: number[]; data_source_id: string }[] | null
> {
  try {
    const response = await together.embeddings.create({
      model: "BAAI/bge-large-en-v1.5",
      input: chunks.map((chunkData) => chunkData.chunk),
    });

    return response.data.map((item, index) => ({
      id: chunks[index].id,
      embedding: item.embedding,
      data_source_id: chunks[index].data_source_id,
    }));
  } catch (error) {
    console.error(`Error getting embeddings: ${error}`);
    return null;
  }
}

async function processEmbeddingBatch(
  batch: { id: number; chunk: string; data_source_id: string }[]
): Promise<
  { id: number; embedding: number[]; data_source_id: string }[] | null
> {
  const totalTokens = batch.reduce(
    (sum, chunkData) => sum + encoder.encode(chunkData.chunk).length,
    0
  );

  try {
    const response = await together.embeddings.create({
      model: "BAAI/bge-large-en-v1.5",
      input: batch.map((chunkData) => chunkData.chunk),
    });
    return response.data.map((item, index) => ({
      id: batch[index].id,
      embedding: item.embedding,
      data_source_id: batch[index].data_source_id,
    }));
  } catch (error) {
    console.error(`Error getting embeddings: ${error}`);
    return null;
  }
}

function averageEmbeddings(embeddings: number[][]): number[] {
  if (embeddings.length === 1) return embeddings[0];
  return embeddings
    .reduce((acc, curr) => acc.map((val, idx) => val + curr[idx]))
    .map((val) => val / embeddings.length);
}

async function updateDatabase(
  client: any,
  id: number,
  url: string,
  content: string,
  embedding: number[],
  data_source_id: string
) {
  try {
    await client.query("BEGIN");

    // Update scraping_url table
    const result = await client.query(
      `
      UPDATE scraping_url
      SET indexing_status = 'COMPLETED'
      WHERE id = $1 AND indexing_status = 'PROCESSING'
      RETURNING id
      `,
      [id]
    );

    if (result.rowCount === 0) {
      await client.query("ROLLBACK");
      return;
    }

    // Update or insert into document table
    await client.query(
      `
      INSERT INTO document (url, content, embedding, active, data_source_id, created_at)
      VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (url) 
      DO UPDATE SET 
        content = EXCLUDED.content, 
        embedding = EXCLUDED.embedding, 
        active = EXCLUDED.active, 
        data_source_id = EXCLUDED.data_source_id, 
        created_at = EXCLUDED.created_at
      `,
      [
        url,
        content,
        JSON.stringify(embedding),
        true,
        data_source_id,
        new Date().toISOString(),
      ]
    );

    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
  }
}

function splitTextIntoChunks(text: string | null, maxTokens: number): string[] {
  if (!text) {
    return [];
  }

  const tokens = encoder.encode(text);
  const chunks: string[] = [];
  let currentChunk: number[] = [];

  for (let i = 0; i < tokens.length; i++) {
    currentChunk.push(tokens[i]);
    if (currentChunk.length >= maxTokens || i === tokens.length - 1) {
      const chunkText = encoder.decode(currentChunk);
      chunks.push(chunkText);
      currentChunk = [];
    }
  }
  return chunks;
}
