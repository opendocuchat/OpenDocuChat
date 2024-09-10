import { db } from "@vercel/postgres";
import { encodingForModel } from "js-tiktoken";
import Together from "together-ai";

const together = new Together({
  apiKey: process.env.TOGETHER_API_KEY,
});

export const maxDuration = 60;

const MAX_TOKENS = 350;
const OVERLAP_TOKENS = 50;
const MAX_BATCH_SIZE = 20;

export async function POST(request: Request) {
  // const scrapingUrlIds = await request.json();
  const created_at = new Date().toISOString();
  const client = await db.connect();

  try {
    await client.query("BEGIN");

    const result = await client.query(`
      UPDATE scraping_url
      SET indexing_status = 'PROCESSING'
      WHERE id IN (
        SELECT id
        FROM scraping_url
        WHERE indexing_status = 'QUEUED'
        LIMIT 10
        )
        RETURNING id, url, content, scraping_run_id
        `);

    const scrapingUrls = result.rows;

    console.log(`Processing ${scrapingUrls.length} URLs for indexing`);
    // Fetch all data_source_ids in one query
    const scraping_run_ids = scrapingUrls.map((url) => url.scraping_run_id);
    const dataSourceResult = await client.query(
      `
      SELECT id, data_source_id 
      FROM scraping_run 
      WHERE id = ANY($1)
      `,
      [scraping_run_ids]
    );
    const dataSourceMap = new Map(
      dataSourceResult.rows.map((row) => [row.id, row.data_source_id])
    );

    const batchedChunks: string[] = [];
    const urlChunkMap: Map<string, number[]> = new Map();

    for (const { id, url, content, scraping_run_id } of scrapingUrls) {
      console.log(`\nProcessing URL: ${url}`);
      if (!content) {
        console.log(`Empty content for URL: ${url}. Skipping indexing.`);
        continue;
      }

      const data_source_id = dataSourceMap.get(scraping_run_id);
      console.log(`Data source ID: ${data_source_id}`);

      const contentChunks = splitTextIntoChunks(
        content,
        MAX_TOKENS,
        OVERLAP_TOKENS
      );

      console.log(`Generated ${contentChunks.length} chunks for URL: ${url}`);

      if (contentChunks.length === 0) {
        console.log(
          `No valid content chunks for URL: ${url}. Skipping indexing.`
        );
        continue;
      }

      batchedChunks.push(...contentChunks);
      urlChunkMap.set(
        url,
        contentChunks.map(
          (_, index) => batchedChunks.length - contentChunks.length + index
        )
      );

      console.log(`Total batched chunks: ${batchedChunks.length}`);

      if (batchedChunks.length >= MAX_BATCH_SIZE) {
        console.log(`\nProcessing batch of ${batchedChunks.length} chunks`);
        await processEmbeddingBatch(
          batchedChunks,
          urlChunkMap,
          client,
          dataSourceMap,
          created_at,
          scrapingUrls
        );
        batchedChunks.length = 0;
        urlChunkMap.clear();
        console.log(
          "Batch processing complete. Cleared batch and URL-chunk map."
        );
      }
    }

    if (batchedChunks.length > 0) {
      console.log(`\nProcessing final batch of ${batchedChunks.length} chunks`);
      await processEmbeddingBatch(
        batchedChunks,
        urlChunkMap,
        client,
        dataSourceMap,
        created_at,
        scrapingUrls
      );
    }

    await client.query("COMMIT");

    return new Response("Indexing completed successfully", { status: 200 });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Error indexing URLs:", error);
    return new Response("Error indexing URLs", { status: 500 });
  } finally {
    client.release();
  }
}

async function processEmbeddingBatch(
  batchedChunks: string[],
  urlChunkMap: Map<string, number[]>,
  client: any,
  dataSourceMap: Map<string, string>,
  created_at: string,
  scrapingUrls: any[]
) {
  console.log(`Getting embeddings for ${batchedChunks.length} chunks`);
  const embeddings = await getEmbeddings(batchedChunks);

  for (const [url, chunkIndices] of Array.from(urlChunkMap.entries())) {
    console.log(`\nProcessing embeddings for URL: ${url}`);
    console.log(`Number of chunks for this URL: ${chunkIndices.length}`);

    const urlEmbeddings = chunkIndices.map((index) => embeddings[index]);
    const finalEmbedding = averageEmbeddings(urlEmbeddings);

    const scraping_run_id = scrapingUrls.find(
      (su) => su.url === url
    )?.scraping_run_id;
    const data_source_id = dataSourceMap.get(scraping_run_id);

    if (data_source_id) {
      console.log(`Updating database for URL: ${url}`);
      await updateDatabase(
        client,
        url,
        batchedChunks[chunkIndices[0]],
        finalEmbedding,
        data_source_id,
        created_at
      );
    } else {
      console.error(`No data_source_id found for URL: ${url}`);
    }
  }
}

async function getEmbeddings(chunks: string[]): Promise<number[][]> {
  const maxAttempts = 5;
  const retryDelay = 500;
  let attempts = 0;

  while (attempts < maxAttempts) {
    try {
      const embeddingResponse = await together.embeddings.create({
        model: "BAAI/bge-large-en-v1.5",
        input: chunks,
      });
      return embeddingResponse.data.map((item) => item.embedding);
    } catch (error) {
      attempts++;
      const delay = retryDelay * Math.pow(2, attempts);
      console.log(`Error occurred. Retrying in ${delay}ms.... error:`, error);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
  throw new Error(`Failed to get embeddings after ${maxAttempts} attempts`);
}

function averageEmbeddings(embeddings: number[][]): number[] {
  if (embeddings.length === 1) return embeddings[0];
  return embeddings
    .reduce((acc, curr) => acc.map((val, idx) => val + curr[idx]))
    .map((val) => val / embeddings.length);
}

async function updateDatabase(
  client: any,
  url: string,
  content: string,
  embedding: number[],
  data_source_id: string,
  created_at: string
) {
  try {
    await client.query("BEGIN");

    // Update scraping_url table
    await client.query(
      `
      UPDATE scraping_url
      SET indexing_status = 'COMPLETED'
      WHERE url = $1 AND indexing_status = 'PROCESSING'
      `,
      [url]
    );

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
        created_at,
      ]
    );

    await client.query("COMMIT");
    console.log("Indexed URL:", url);
  } catch (error) {
    await client.query("ROLLBACK");
    console.error(`Error updating database for URL ${url}:`, error);
    // Don't throw the error, just log it and continue with other URLs
  }
}

function splitTextIntoChunks(
  text: string | null,
  maxTokens: number,
  overlapTokens: number
): string[] {
  if (!text) {
    return [];
  }

  const encoder = encodingForModel("gpt-3.5-turbo");
  const tokens = encoder.encode(text);
  const chunks: string[] = [];

  for (let i = 0; i < tokens.length; i += maxTokens - overlapTokens) {
    const chunkTokens = tokens.slice(i, i + maxTokens);
    const chunkText = encoder.decode(chunkTokens);
    chunks.push(chunkText);
  }

  return chunks;
}
