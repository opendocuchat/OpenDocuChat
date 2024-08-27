// app/(private)/manage-index/_indexing/actions.ts
"use server";

import { sql } from "@vercel/postgres";
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
    const tokens = encoder.encode(row.content);
    totalTokens += tokens.length;
    console.log("totalTokens", totalTokens);
  }

  return totalTokens;
}


export async function indexScrapingUrls(scrapingUrlIds: number[]) {
    const batchSize = 50;
    const created_at = new Date().toISOString();
  
    try {
    
    for (let i = 0; i < scrapingUrlIds.length; i += batchSize) {
      const batchIds = scrapingUrlIds.slice(i, i + batchSize);
      const placeholders = batchIds.map((_, index) => `$${index + 1}`).join(", ");
  
      const query = `
        SELECT id, url, content, scraping_run_id
        FROM scraping_url
        WHERE id IN (${placeholders})
      `;
  
      const result = await sql.query(query, batchIds);
  
      const texts = result.rows.map(row => row.content);
  
      const embeddingResponse = await together.embeddings.create({
        model: "BAAI/bge-large-en-v1.5",
        input: texts,
      });
  
      const embeddings = embeddingResponse.data.map(item => item.embedding);
  
      for (let j = 0; j < result.rows.length; j++) {
        const { id, url, content, scraping_run_id } = result.rows[j];
        const embedding = embeddings[j];
  
        // First, get the data_source_id from the scraping_run
        const dataSourceResult = await sql`
          SELECT data_source_id 
          FROM scraping_run 
          WHERE id = ${scraping_run_id}
        `;
  
        const data_source_id = dataSourceResult.rows[0].data_source_id;
  
        // Now insert or update the document
        await sql`
          INSERT INTO document (url, content, embedding, active, data_source_id, created_at)
          VALUES (${url}, ${content}, ${JSON.stringify(embedding)}, ${true}, ${data_source_id}, ${created_at})
          ON CONFLICT (url) 
          DO UPDATE SET 
            content = EXCLUDED.content, 
            embedding = EXCLUDED.embedding, 
            active = EXCLUDED.active, 
            data_source_id = EXCLUDED.data_source_id, 
            created_at = EXCLUDED.created_at
        `;
  
        // // Update the status of the scraping_url to indicate it's been indexed
        // // TODO: update db schema for this, update above upsert clause to mark old record from indexed back to scraped
        // await sql`
        //   UPDATE scraping_url
        //   SET status = 'INDEXED'
        //   WHERE id = ${id}
        // `;

        console.log("Indexed URL:", url);
      }
    }
  
    return { success: true, message: "Indexing completed successfully" };
  } catch (error) {
    console.error("Error indexing URLs:", error);
    return { success: false, message: "Error indexing URLs" };
  }
}
  
  