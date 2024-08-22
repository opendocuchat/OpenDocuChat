"use server"

import { ScrapingUrl } from "@/types/database";
import { sql } from "@vercel/postgres";

export async function getScrapingUrlDetails(scrapingRunId: number) {
    const scrapingUrlDetails = await sql<ScrapingUrl>`SELECT * FROM scraping_url WHERE scraping_run_id = ${scrapingRunId}`;
    return scrapingUrlDetails.rows;
}