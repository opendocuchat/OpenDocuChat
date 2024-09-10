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

  return result.rows.map((row) => ({
    ...row,
    embedding: [],
    content: "",
    metadata: {},
  }));
}

export async function deleteDocumentsByDataSourceId(dataSourceId: string) {
  try {
    await sql`BEGIN`;

    await sql`
      UPDATE scraping_url
      SET indexing_status = 'NOT_INDEXED'
      WHERE id IN (
        SELECT su.id
        FROM scraping_url su
        JOIN document d ON su.url = d.url
        WHERE d.data_source_id = ${dataSourceId}
          AND su.indexing_status = 'COMPLETED'
      )
    `;

    await sql`
      DELETE FROM document
      WHERE data_source_id = ${dataSourceId}
    `;

    await sql`COMMIT`;

    return { success: true };
  } catch (error) {
    await sql`ROLLBACK`;
    console.error("Error deleting documents and updating scraping_url:", error);
    throw new Error("Failed to delete documents and update scraping_url");
  }
}
