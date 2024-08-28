// app/api/scrape/route.ts

import { NextRequest, NextResponse } from "next/server";
import { db, VercelPoolClient } from "@vercel/postgres";
import puppeteerLocal from "puppeteer";
import puppeteer, { Browser, Page } from "puppeteer-core";
import chromium from "@sparticuz/chromium-min";
import { ScrapingStatus, ScrapingUrl } from "@/types/database";
import { cancelScrapingUrls } from "@/app/(private)/manage-index/_docu-scraper/actions";

interface CrawlSettings {
  stayOnDomain: boolean;
  stayOnPath: boolean;
  excludeFileTypes: string[];
  maxParallelScrapers: number;
}

export const maxDuration = 60;

export async function POST(request: NextRequest) {
  const { scrapingRunId, startUrl, settings } = await request.json();

  await scrapeUrlLoop(scrapingRunId, startUrl, settings).catch(console.error);

  return NextResponse.json({
    success: true,
    message: "Scraping process started",
  });
}

async function scrapeUrlLoop(
  scrapingRunId: number,
  startUrl: string,
  settings: any
) {
  const startTime = Date.now();
  const pgClient = await db.connect();

  let browser;
  let page;
  let nextUrl;

  const timeoutDuration = 45000;

  try {
    while (Date.now() - startTime < timeoutDuration) {
      await resetStuckScrapingUrls(pgClient, scrapingRunId);

      const isCancelled = await checkIfCancelledScrapingRun(pgClient, scrapingRunId);
      if (isCancelled) {
        await cancelScrapingUrls(scrapingRunId);
        return;
      }

      const processingCount = await getProcessingUrlsCount(
        pgClient,
        scrapingRunId
      );
      if (processingCount >= settings.maxParallelScrapers) {
        return;
      }

      nextUrl = await getNextUrlToScrape(pgClient, scrapingRunId);
      if (!nextUrl) {
        return;
      }

      if (!browser) {
        browser = await setupBrowser();
        page = await setupPage(browser);
      }

      const timeLeft = timeoutDuration - (Date.now() - startTime);
      if (timeLeft <= 0) {
        break;
      }

      const scrapePromise = scrapeUrl(nextUrl.url, page!, startUrl, settings);
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Scraping timeout")), timeLeft)
      );

      const { links: discoveredUrls, content } = (await Promise.race([
        scrapePromise,
        timeoutPromise,
      ])) as { links: string[]; content: string };

      await Promise.all([
        addUrlsToScrape(pgClient, scrapingRunId, discoveredUrls),
        saveScrapedContent(pgClient, nextUrl.id, content),
        updateUrlStatus(pgClient, nextUrl.id, ScrapingStatus.COMPLETED),
      ]);
    }
  } catch (error: any) {
    console.error(
      `Error or timeout while crawling URL ${nextUrl?.url}:`,
      error
    );
    if (nextUrl && nextUrl.id !== undefined) {
      const status =
        error instanceof Error && error.message === "Scraping timeout"
          ? ScrapingStatus.QUEUED
          : ScrapingStatus.FAILED;

      await updateUrlStatus(pgClient, nextUrl.id, status);
    }
  } finally {
    pgClient.release();
    if (browser) {
      await browser.close();
    }
  }
}

async function resetStuckScrapingUrls(
  pgClient: VercelPoolClient,
  scrapingRunId: number
) {
  const stuckScrapers = await pgClient.sql`
    UPDATE scraping_url
    SET status = ${ScrapingStatus.QUEUED}
    WHERE scraping_run_id = ${scrapingRunId} AND status = ${ScrapingStatus.PROCESSING} AND updated_at < now() - interval '1 minute'
  `;

  if (stuckScrapers.rowCount !== null && stuckScrapers.rowCount > 0) {
    console.log(`Reset ${stuckScrapers.rowCount} stuck scraping urls`);
  }
}

async function setupBrowser(): Promise<any> {
  if (process.env.VERCEL_ENV === "development") {
    return puppeteerLocal.launch({
      headless: true,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
      ],
      defaultViewport: null,
    });
  } else {
    try {
      const browser = await puppeteer.launch({
        args: [...chromium.args, "--hide-scrollbars", "--disable-web-security"],
        defaultViewport: chromium.defaultViewport,
        executablePath: await chromium.executablePath(
          "https://github.com/Sparticuz/chromium/releases/download/v127.0.0/chromium-v127.0.0-pack.tar"
        ),
        headless: chromium.headless,
      });
      console.log("Browser setup complete on Vercel.");
      return browser;
    } catch (error) {
      console.error("Error setting up browser on Vercel:", error);
      throw error;
    }
  }
}

async function setupPage(browser: Browser): Promise<Page> {
  console.log("Setting up page...");
  const page = await browser.newPage();
  await page.setUserAgent(
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
  );
  await page.setJavaScriptEnabled(true);
  console.log("Page setup complete.");
  return page;
}

async function checkIfCancelledScrapingRun(
  client: VercelPoolClient,
  scrapingRunId: number
): Promise<boolean> {
  const result = await client.sql`
      SELECT status
      FROM scraping_run
      WHERE id = ${scrapingRunId}
    `;
  return result.rows[0].status === ScrapingStatus.CANCELLED;
}

async function getProcessingUrlsCount(
  client: VercelPoolClient,
  scrapingRunId: number
): Promise<number> {
  const result = await client.sql`
      SELECT COUNT(*) as count
      FROM scraping_url
      WHERE scraping_run_id = ${scrapingRunId} AND status = ${ScrapingStatus.PROCESSING}
    `;
  return result.rows[0].count;
}

async function getNextUrlToScrape(
  client: VercelPoolClient,
  scrapingRunId: number
): Promise<ScrapingUrl | null> {
  const result = await client.sql<ScrapingUrl>`
      WITH next_url AS (
        SELECT id, url, status
        FROM scraping_url
        WHERE scraping_run_id = ${scrapingRunId} AND status = ${ScrapingStatus.QUEUED}
        ORDER BY RANDOM()
        LIMIT 1
        FOR UPDATE SKIP LOCKED
      )
      UPDATE scraping_url
      SET status = ${ScrapingStatus.PROCESSING}, updated_at = CURRENT_TIMESTAMP
      FROM next_url
      WHERE scraping_url.id = next_url.id
      RETURNING scraping_url.id, scraping_url.url, scraping_url.status
    `;

  return result.rows[0] || null;
}

async function saveScrapedContent(
  client: VercelPoolClient,
  urlId: number,
  content: string
) {
  await client.sql`
        UPDATE scraping_url
        SET content = ${content}
        WHERE id = ${urlId}
      `;
}

async function updateUrlStatus(
  client: VercelPoolClient,
  id: number,
  status: ScrapingStatus
) {
  await client.sql`
        UPDATE scraping_url
        SET status = ${status}, updated_at = CURRENT_TIMESTAMP
        WHERE id = ${id}
      `;
}

async function addUrlsToScrape(
  client: VercelPoolClient,
  scrapingRunId: number,
  urls: string[]
) {
  const addUrlPromises = urls.map(async (url) => {
    const existingUrl = await client.sql`
        SELECT id FROM scraping_url
        WHERE scraping_run_id = ${scrapingRunId} AND url = ${url}
      `;

    if (existingUrl.rows.length === 0) {
      await client.sql`
          INSERT INTO scraping_url (scraping_run_id, url, status, is_indexed)
          VALUES (${scrapingRunId}, ${url}, ${ScrapingStatus.QUEUED}, false)
        `;
    }
  });

  await Promise.all(addUrlPromises);
}

function getBaseUrl(url: string): string {
  const parsedUrl = new URL(url);
  return `${parsedUrl.protocol}//${parsedUrl.hostname}`;
}

function getBasePath(url: string): string {
  const parsedUrl = new URL(url);
  return parsedUrl.pathname.split("/").slice(0, 2).join("/");
}

async function scrapeUrl(
  url: string,
  page: Page,
  startUrl: string,
  settings: CrawlSettings
): Promise<{ links: string[]; content: string }> {
  const baseUrl = getBaseUrl(startUrl);
  const basePath = getBasePath(startUrl);

  console.log(`Navigating to ${url}`);

  await page.goto(url, { waitUntil: ["domcontentloaded"], timeout: 7000 });
  await page.waitForSelector("body", { timeout: 7000 });
  await autoScroll(page);

  const { links, content } = await page.evaluate(() => {
    const links = Array.from(document.querySelectorAll("a"))
      .map((a) => a.href)
      .filter((href) => href.startsWith("http"));

    const extractVisibleText = (node: Node): string => {
      if (node.nodeType === Node.TEXT_NODE) {
        return node.textContent?.trim() || "";
      }
      if (node.nodeType !== Node.ELEMENT_NODE) {
        return "";
      }
      const element = node as Element;
      const style = window.getComputedStyle(element);
      if (style.display === "none" || style.visibility === "hidden") {
        return "";
      }
      return Array.from(element.childNodes)
        .map(extractVisibleText)
        .join(" ")
        .trim();
    };

    const content = extractVisibleText(document.body);

    return { links, content };
  });

  const uniqueLinks = Array.from(new Set(links));

  const indexableLinks = uniqueLinks
    .filter((link) => isIndexableUrl(link, baseUrl, basePath, settings))
    .map((link) => {
      const url = new URL(link);
      url.hash = "";
      return url.toString();
    });

  return { links: indexableLinks, content };
}

async function autoScroll(page: Page): Promise<void> {
  await page.evaluate(async () => {
    await new Promise<void>((resolve) => {
      let totalHeight = 0;
      const distance = 100;
      const timer = setInterval(() => {
        const scrollHeight = document.body.scrollHeight;
        window.scrollBy(0, distance);
        totalHeight += distance;

        if (totalHeight >= scrollHeight) {
          clearInterval(timer);
          resolve();
        }
      }, 100);
    });
  });
}

function isIndexableUrl(
  url: string,
  baseUrl: string,
  basePath: string,
  settings: CrawlSettings
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
