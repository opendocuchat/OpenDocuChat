// app/(private)/manage-index/_indexing/actions.ts
"use server";

import { sql, db } from "@vercel/postgres";
import { encodingForModel } from "js-tiktoken";
import Together from "together-ai";

const together = new Together({
  apiKey: process.env.TOGETHER_API_KEY,
});

export async function getUrlContentTokenCount(
  urlIds: number[]
): Promise<number> {
  const placeholders = urlIds.map((_, index) => `$${index + 1}`).join(", ");

  const query = `
    SELECT content
    FROM scraping_url
    WHERE id IN (${placeholders})
  `;

  const result = await sql.query(query, urlIds);

  const encoder = encodingForModel("gpt-3.5-turbo");
  let totalTokens = 0;

  for (const row of result.rows) {
    if (row.content !== null && row.content !== "") {
      const tokens = encoder.encode(row.content);
      totalTokens += tokens.length;
    }
  }
  return totalTokens;
}


const MAX_TOKENS = 450;
const OVERLAP_TOKENS = 50;

function splitTextIntoChunks(text: string, maxTokens: number, overlapTokens: number): string[] {
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

export async function indexScrapingUrls(scrapingUrlIds: number[]) {
  const created_at = new Date().toISOString();
  const client = await db.connect();

  try {
    await client.query('BEGIN');

    for (const id of scrapingUrlIds) {
      const result = await client.query(`
        SELECT id, url, content, scraping_run_id
        FROM scraping_url
        WHERE id = $1
      `, [id]);

      if (result.rows.length === 0) {
        console.log(`No scraping URL found for id: ${id}`);
        continue;
      }

      const { url, content, scraping_run_id } = result.rows[0];

      // Get the data_source_id from the scraping_run
      const dataSourceResult = await client.query(`
        SELECT data_source_id 
        FROM scraping_run 
        WHERE id = $1
      `, [scraping_run_id]);

      const data_source_id = dataSourceResult.rows[0].data_source_id;

      // Split the content into chunks if necessary
      const contentChunks = splitTextIntoChunks(content, MAX_TOKENS, OVERLAP_TOKENS);

      // Generate embeddings for each chunk
      const embeddings = await Promise.all(contentChunks.map(async (chunk) => {
        const embeddingResponse = await together.embeddings.create({
          model: "BAAI/bge-large-en-v1.5",
          input: [chunk],
        });
        return embeddingResponse.data[0].embedding;
      }));

      // Combine embeddings if there are multiple chunks
      const finalEmbedding = embeddings.length > 1
        ? embeddings.reduce((acc, curr) => acc.map((val, idx) => val + curr[idx]))
            .map(val => val / embeddings.length)
        : embeddings[0];

      // First, try to update any existing indexed URL
      const updateResult = await client.query(`
        UPDATE scraping_url
        SET is_indexed = FALSE
        WHERE url = $1 AND is_indexed = TRUE
        RETURNING id
      `, [url]);

      if ((updateResult.rowCount ?? 0) > 0) {
        console.log(`Unindexed previous entry for URL: ${url}`);
      }

      // Now, insert or update the document
      await client.query(`
        INSERT INTO document (url, content, embedding, active, data_source_id, created_at)
        VALUES ($1, $2, $3, $4, $5, $6)
        ON CONFLICT (url) 
        DO UPDATE SET 
          content = EXCLUDED.content, 
          embedding = EXCLUDED.embedding, 
          active = EXCLUDED.active, 
          data_source_id = EXCLUDED.data_source_id, 
          created_at = EXCLUDED.created_at
      `, [url, content, JSON.stringify(finalEmbedding), true, data_source_id, created_at]);

      // Update the is_indexed status of the current scraping_url
      await client.query(`
        UPDATE scraping_url
        SET is_indexed = TRUE
        WHERE id = $1
      `, [id]);

      console.log("Indexed URL:", url);
    }

    await client.query('COMMIT');
    return { success: true, message: "Indexing completed successfully" };
  } catch (error) {
    await client.query('ROLLBACK');
    console.error("Error indexing URLs:", error);
    return { success: false, message: "Error indexing URLs" };
  } finally {
    client.release();
  }
}