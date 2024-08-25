// app/(private)/manage-index/_docu-scraper/actions.ts
"use server";

// import puppeteer, { Page, Browser } from "puppeteer";
import { sql } from "@vercel/postgres";
import {
  DataSource,
  DataSourceType,
  ScrapingStatus,
  ScrapingUrl,
} from "@/types/database";
import { UrlTreeNode } from "./url-tree";

async function triggerScraping(
  scrapingRunId: number,
  startUrl: string,
  settings: CrawlerSettings
) {
  const maxConcurrent = 3;
  const apiUrl = `${
    process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000"
  }/api/scrape/process`;

  for (let i = 0; i < maxConcurrent; i++) {
    fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ scrapingRunId, startUrl, settings }),
    }).catch(console.error);
  }
}

interface CrawlerSettings {
  stayOnDomain: boolean;
  stayOnPath: boolean;
  excludeFileTypes: string[];
}

const MAX_CONCURRENT_PROCESSING = 3;

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

export async function cancelScrapingRun(scrapingRunId: number) {
  try {
    await sql`
        UPDATE scraping_url
        SET status = ${ScrapingStatus.CANCELLED}
        WHERE scraping_run_id = ${scrapingRunId} AND status = ${ScrapingStatus.QUEUED}
      `;
    return { success: true };
  } catch (error) {
    console.error("Error stopping scraper:", error);
    return { success: false, error: "Failed to stop scraping" };
  }
}

function isIndexableUrl(
  url: string,
  baseUrl: string,
  basePath: string,
  settings: CrawlerSettings
): boolean {
  try {
    const linkUrl = new URL(url);
    const baseUrlObj = new URL(baseUrl);

    if (settings.excludeFileTypes && settings.excludeFileTypes.length > 0) {
      const extension = linkUrl.pathname.split(".").pop()?.toLowerCase();
      if (extension && settings.excludeFileTypes.includes(extension)) {
        return false;
      }
    }

    if (settings.stayOnDomain && linkUrl.hostname !== baseUrlObj.hostname) {
      return false;
    }

    if (settings.stayOnPath && !linkUrl.pathname.startsWith(basePath)) {
      return false;
    }

    return true;
  } catch (error) {
    console.error(`Invalid URL: ${url}`);
    return false;
  }
}

export async function startDocuScraper(
  startUrl: string,
  settings: CrawlerSettings
) {
  if (!startUrl) {
    throw new Error("Invalid input");
  }
  console.log(`Starting scraper with start URL: ${startUrl}`);

  try {
    const { scrapingRunId, dataSourceId } = await createScrapingRun(startUrl);
    await addUrlToScrape(scrapingRunId, startUrl);

    const url = `${
      process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000"
    }/api/scrape/start`;
    fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ scrapingRunId, startUrl, settings }),
    }).catch(console.error);

    // const url = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/api/scrape/process`;
    // fetch(url, {
    //   method: 'POST',
    //   headers: {
    //     'Content-Type': 'application/json',
    //   },
    //   body: JSON.stringify({ scrapingRunId, startUrl, settings }),
    // }).catch(console.error);

    return { success: true, scrapingRunId, dataSourceId };
  } catch (error) {
    console.error("Error starting scraper:", error);
    return { success: false, error: "Failed to start scraping" };
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

export async function fetchUrlContent(
  scrapeUrlId: number
): Promise<string | null> {
  const result = await sql<{ content: string }>`
    SELECT content
    FROM scraping_url
    WHERE id = ${scrapeUrlId}
  `;

  if (result.rows.length === 0) {
    return null;
  }

  return result.rows[0].content;
}

export async function fetchScrapingResultsAndStatus(
  scrapingRunId: number
): Promise<{ treeData: UrlTreeNode; isComplete: boolean }> {
  const result = await sql<ScrapingUrl>`
    SELECT id, url, status
    FROM scraping_url
    WHERE scraping_run_id = ${scrapingRunId}
  `;

  const urls = result.rows;

  if (urls.length === 0) {
    return {
      treeData: {
        name: "No URLs discovered",
        path: "/",
        type: "directory",
        children: [],
        selected: false,
        expanded: true,
      },
      isComplete: true,
    };
  }

  const baseUrl = new URL(urls[0].url).origin;

  const root: UrlTreeNode = {
    name: baseUrl,
    path: "/",
    type: "directory",
    children: [],
    selected: false,
    expanded: true,
  };

  urls.forEach(({ id, url, status }) => {
    const parsedUrl = new URL(url);
    const pathParts = parsedUrl.pathname.split("/").filter(Boolean);

    let currentNode = root;
    pathParts.forEach((part, index) => {
      const isLastPart = index === pathParts.length - 1;
      const path = "/" + pathParts.slice(0, index + 1).join("/");
      let childNode = currentNode.children?.find(
        (child) => child.path === path
      );

      if (!childNode) {
        childNode = {
          name: part,
          path: path,
          type: isLastPart ? "file" : "directory",
          children: isLastPart ? undefined : [],
          selected: false,
          expanded: true,
          status: isLastPart ? (status as ScrapingStatus) : undefined,
          scrapeUrlId: isLastPart ? id : undefined,
        };
        currentNode.children = currentNode.children || [];
        currentNode.children.push(childNode);
      } else if (isLastPart) {
        childNode.status = status as ScrapingStatus;
        childNode.scrapeUrlId = id;
      }

      currentNode = childNode;
    });
  });

  const incompleteCount = urls.filter(
    (url) =>
      url.status === ScrapingStatus.QUEUED ||
      url.status === ScrapingStatus.PROCESSING
  ).length;
  const isComplete = incompleteCount === 0;

  return { treeData: root, isComplete };
}
