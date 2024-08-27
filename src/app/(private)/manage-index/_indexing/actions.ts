// app/(private)/manage-index/_indexing/actions.ts
"use server";

import { sql } from "@vercel/postgres";
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
    const tokens = encoder.encode(row.content);
    totalTokens += tokens.length;
    console.log("totalTokens", totalTokens);
  }

  return totalTokens;
}
