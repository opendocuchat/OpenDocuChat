"use server"

import { ScrapingRun } from "@/types/database";
import { sql } from "@vercel/postgres";

export async function getScrapingRuns(dataSourceId: number) {
    const scrapeRuns = await sql<ScrapingRun>`SELECT * FROM scraping_run WHERE data_source_id = ${dataSourceId}`;
    return scrapeRuns.rows;
}