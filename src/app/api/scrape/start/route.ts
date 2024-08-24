// app/api/scrape/start/route.ts

import { DataSource, DataSourceType, ScrapingStatus } from "@/types/database";
import { sql } from "@vercel/postgres";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const { startUrl, settings } = await request.json();

  if (!startUrl) {
    return NextResponse.json({ success: false, error: "Invalid input" }, { status: 400 });
  }

  console.log(`Starting scraper with start URL: ${startUrl}`);

  try {
    const { scrapingRunId, dataSourceId } = await createScrapingRun(startUrl);
    await addUrlToScrape(scrapingRunId, startUrl);

    fetch(`http://www.${process.env.VERCEL_URL}/api/scrape/process`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      keepalive: true,
      body: JSON.stringify({ scrapingRunId, startUrl, settings }),
    }).catch(console.error);

    return NextResponse.json({ success: true, scrapingRunId, dataSourceId });
  } catch (error) {
    console.error("Error starting scraper:", error);
    return NextResponse.json({ success: false, error: "Failed to start scraping" }, { status: 500 });
  }
}

async function addUrlToScrape(scrapingRunId: number, url: string) {
  const existingUrl = await sql`
    SELECT id FROM scraping_url
    WHERE scraping_run_id = ${scrapingRunId} AND url = ${url}
  `;

  if (existingUrl.rows.length === 0) {
    await sql`
      INSERT INTO scraping_url (scraping_run_id, url, status)
      VALUES (${scrapingRunId}, ${url}, ${ScrapingStatus.QUEUED})
    `;
  }
}

async function createScrapingRun(url: string) {
  try {
    const dataSource = await getOrCreateDataSource(url, "docu_scrape");
    const result = await sql`
      INSERT INTO scraping_run (data_source_id)
      VALUES (${dataSource.id})
      RETURNING id
    `;
    console.log(`Scraping run created with ID: ${result.rows[0].id}`);
    return { scrapingRunId: result.rows[0].id, dataSourceId: dataSource.id };
  } catch (e) {
    console.error("Error creating scraping run:", e);
    throw e;
  }
}

async function getOrCreateDataSource(
  url: string,
  type: DataSourceType
): Promise<DataSource> {
  const existingResult = await sql<DataSource>`
    SELECT id, name, url, type
    FROM data_source
    WHERE url = ${url}
  `;

  if (existingResult.rows.length > 0) {
    return existingResult.rows[0];
  }

  const name = new URL(url).hostname;
  const newResult = await sql<DataSource>`
    INSERT INTO data_source (name, url, type)
    VALUES (${name}, ${url}, ${type})
    RETURNING id, name, url, type
  `;

  return newResult.rows[0];
}