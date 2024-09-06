import { db } from "@vercel/postgres";
import { encodingForModel } from "js-tiktoken";
import Together from "together-ai";

const together = new Together({
  apiKey: process.env.TOGETHER_API_KEY,
});

export const maxDuration = 60;

const MAX_TOKENS = 350;
const OVERLAP_TOKENS = 50;

export async function POST(request: Request) {
  const scrapingUrlIds = await request.json();
  const created_at = new Date().toISOString();
  const client = await db.connect();

  try {
    await client.query("BEGIN");

    for (const id of scrapingUrlIds) {
      const result = await client.query(
        `
            SELECT id, url, content, scraping_run_id
            FROM scraping_url
            WHERE id = $1
          `,
        [id]
      );

      if (result.rows.length === 0) {
        console.log(`No scraping URL found for id: ${id}`);
        continue;
      }

      const { url, content, scraping_run_id } = result.rows[0];

      if (!content) {
        console.log(`Empty content for URL: ${url}. Skipping indexing.`);
        continue;
      }

      const dataSourceResult = await client.query(
        `
            SELECT data_source_id 
            FROM scraping_run 
            WHERE id = $1
          `,
        [scraping_run_id]
      );

      const data_source_id = dataSourceResult.rows[0].data_source_id;

      const contentChunks = splitTextIntoChunks(
        content,
        MAX_TOKENS,
        OVERLAP_TOKENS
      );

      if (contentChunks.length === 0) {
        console.log(
          `No valid content chunks for URL: ${url}. Skipping indexing.`
        );
        continue;
      }

      const embeddings = await Promise.all(
        contentChunks.map(async (chunk) => {
          const maxAttempts = 5;
          const retryDelay = 500;
          let attempts = 0;

          while (attempts < maxAttempts) {
            try {
              console.log(`Getting embedding for chunk length: ${chunk.length}`);
              const embeddingResponse = await together.embeddings.create({
                model: "BAAI/bge-large-en-v1.5",
                input: [chunk],
              });
              return embeddingResponse.data[0].embedding;
            } catch (error) {
              attempts++;
              const delay = retryDelay * Math.pow(2, attempts);
              console.log(`Error occurred. Retrying in ${delay}ms.... error:`, error);
              await new Promise((resolve) => setTimeout(resolve, delay));
            }
          }
          throw new Error(
            `Failed to get embedding after ${maxAttempts} attempts`
          );
        })
      );

      const finalEmbedding =
        embeddings.length > 1
          ? embeddings
              .reduce((acc, curr) => acc.map((val, idx) => val + curr[idx]))
              .map((val) => val / embeddings.length)
          : embeddings[0];

      const updateResult = await client.query(
        `
            UPDATE scraping_url
            SET indexing_status = "NOT_INDEXED"
            WHERE url = $1 AND indexing_status = "COMPLETED"
            RETURNING id
          `,
        [url]
      );

      if ((updateResult.rowCount ?? 0) > 0) {
        console.log(`Updated existing index for URL: ${url}`);
      }

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
          JSON.stringify(finalEmbedding),
          true,
          data_source_id,
          created_at,
        ]
      );

      await client.query(
        `
            UPDATE scraping_url
            SET indexing_status = "COMPLETED"
            WHERE id = $1
          `,
        [id]
      );

      console.log("Indexed URL:", url);
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
