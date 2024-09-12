import { db } from "@vercel/postgres";
import { encodingForModel } from "js-tiktoken";
import Together from "together-ai";

const together = new Together({
  apiKey: process.env.TOGETHER_API_KEY,
});

const MAX_TOKENS = 300;
const encoder = encodingForModel("gpt-3.5-turbo");

function logWithTimestamp(message: string) {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${message}`);
}

const timeout = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export async function POST(request: Request) {
  const client = await db.connect();
  let id: number | null = null;

  try {
    // Get a single queued URL
    const result = await client.query(`
      UPDATE scraping_url
      SET indexing_status = 'PROCESSING'
      WHERE id = (
        SELECT id
        FROM scraping_url
        WHERE indexing_status = 'QUEUED'
        ORDER BY id
        LIMIT 1
        FOR UPDATE SKIP LOCKED
      )
      RETURNING id, url, content, scraping_run_id
    `);

    if (result.rows.length === 0) {
      return new Response("No URLs to process", { status: 200 });
    }

    const { id, url, content, scraping_run_id } = result.rows[0];

    // Get data_source_id
    const dataSourceResult = await client.query(
      `SELECT data_source_id FROM scraping_run WHERE id = $1`,
      [scraping_run_id]
    );
    const data_source_id = dataSourceResult.rows[0].data_source_id;

    // Split content into chunks
    const chunks = splitTextIntoChunks(content, MAX_TOKENS);
    logWithTimestamp(`Total chunks: ${chunks.length}`);

    // Get embeddings
    const embeddings = await getEmbeddings(chunks);

    if (embeddings === null) {
      // Reset URL status to 'QUEUED' if embedding fails
      await client.query(
        `UPDATE scraping_url SET indexing_status = 'QUEUED' WHERE id = $1`,
        [id]
      );
      return new Response("Indexing failed, URL reset to QUEUED", { status: 200 });
    }

    // Combine embeddings
    const finalEmbedding = averageEmbeddings(embeddings);

    // Save to database
    await updateDatabase(client, id, url, content, finalEmbedding, data_source_id);

    return new Response("Indexing completed", { status: 200 });
  } catch (error) {
    logWithTimestamp(`Error indexing URL: ${error}`);
    if (id) {
      await client.query(
        `UPDATE scraping_url SET indexing_status = 'FAILED' WHERE id = $1`,
        [id]
      );
    }
    return new Response("Error indexing URL", { status: 500 });
  } finally {
    client.release();
  }
}

async function getEmbeddings(chunks: string[]): Promise<number[][] | null> {
  const embeddings: number[][] = [];
  const batchSize = 10;

  for (let i = 0; i < chunks.length; i += batchSize) {
    const batch = chunks.slice(i, i + batchSize);
    const tokenCounts = batch.map(chunk => encoder.encode(chunk).length);
    
    logWithTimestamp(`API call ${i / batchSize + 1}: Processing ${batch.length} chunks`);
    logWithTimestamp(`Token counts: ${tokenCounts.join(', ')}`);

    try {
      const response = await together.embeddings.create({
        model: "BAAI/bge-large-en-v1.5",
        input: batch,
      });
      
      embeddings.push(...response.data.map(item => item.embedding));
      logWithTimestamp(`API call ${i / batchSize + 1}: Successful`);
    } catch (error) {
      logWithTimestamp(`API call ${i / batchSize + 1}: Error getting embeddings: ${error}`);
      return null; // Indicate failure
    }
  }

  logWithTimestamp(`Total API calls: ${Math.ceil(chunks.length / batchSize)}`);
  return embeddings;
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
      logWithTimestamp(`URL ${url} was not in PROCESSING state. Skipping update.`);
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
    logWithTimestamp(`Error updating database for URL ${url}: ${error}`);
  }
}

function splitTextIntoChunks(
  text: string | null,
  maxTokens: number
): string[] {
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
      logWithTimestamp(`Chunk ${chunks.length} token count: ${currentChunk.length}`);
      currentChunk = [];
    }
  }

  logWithTimestamp(`Total chunks: ${chunks.length}`);
  return chunks;
}
