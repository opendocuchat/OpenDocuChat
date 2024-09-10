// app/(private)/manage-index/_indexing/actions.ts
"use server";

import { sql, db } from "@vercel/postgres";
import { encodingForModel } from "js-tiktoken";

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

export async function queueUrlsForIndexing(urlIds: number[]): Promise<number> {
  const placeholders = urlIds.map((_, index) => `$${index + 1}`).join(", ");

  const query = `
    UPDATE scraping_url
    SET indexing_status = 'QUEUED'
    WHERE id IN (${placeholders})
    AND indexing_status != 'COMPLETED'
    RETURNING id
  `;

  const result = await sql.query(query, urlIds);
  return result.rowCount ?? 0;
}

export async function getIndexingProgress(
  queuedIds: number[]
): Promise<{ queued: number; completed: number }> {
  const placeholders = queuedIds.map((_, index) => `$${index + 1}`).join(", ");

  const query = `
    SELECT 
      SUM(CASE WHEN indexing_status = 'QUEUED' THEN 1 ELSE 0 END) as queued,
      SUM(CASE WHEN indexing_status = 'COMPLETED' THEN 1 ELSE 0 END) as completed
    FROM scraping_url
    WHERE id IN (${placeholders})
  `;

  const result = await sql.query(query, queuedIds);
  return {
    queued: parseInt(result.rows[0].queued) || 0,
    completed: parseInt(result.rows[0].completed) || 0,
  };
}
