// app/(private)/manage-index/_document_index/actions.ts
"use server";

import { Document } from "@/types/database";
import { sql } from "@vercel/postgres";

export async function getDocuments() {
  const result = await sql<Document>`
    SELECT id, url, active, data_source_id, created_at
    FROM document
    ORDER BY created_at DESC
    LIMIT 100
  `;
  
  return result.rows.map(row => ({
    ...row,
    embedding: [], // We're not fetching the embedding for performance reasons
    content: "", // We're not fetching the content for performance reasons
    metadata: {}, // We're not fetching the metadata for performance reasons
  }));
}