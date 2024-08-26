"use server";

import { sql } from "@vercel/postgres";
import { ScrapingRun, ScrapingUrl } from "@/types/database";

export async function getScrapingRunsAndUrls(dataSourceId: number) {
  const result = await sql`
    WITH scraping_runs AS (
      SELECT * FROM scraping_run WHERE data_source_id = ${dataSourceId}
    )
    SELECT 
      sr.id AS run_id,
      sr.created_at AS run_created_at,
      su.id AS url_id,
      su.url,
      su.status AS url_status,
      su.created_at AS url_created_at,
      su.updated_at AS url_updated_at
    FROM scraping_runs sr
    LEFT JOIN scraping_url su ON sr.id = su.scraping_run_id
    ORDER BY sr.created_at DESC, su.id
  `;

  const runs: ScrapingRun[] = [];
  const urlDetails: Record<number, ScrapingUrl[]> = {};

  result.rows.forEach((row) => {
    if (!urlDetails[row.run_id]) {
      runs.push({
        id: row.run_id,
        data_source_id: dataSourceId,
        created_at: row.run_created_at,
        status: row.run_status,
      });
      urlDetails[row.run_id] = [];
    }
    if (row.url_id) {
      urlDetails[row.run_id].push({
        id: row.url_id,
        scraping_run_id: row.run_id,
        url: row.url,
        status: row.url_status,
        content: "",
        created_at: row.url_created_at,
        updated_at: row.url_updated_at,
      });
    }
  });

  return { runs, urlDetails };
}
