"use server";

// import puppeteer, { Page, Browser } from "puppeteer";
import { sql, db, VercelPoolClient } from "@vercel/postgres";
import {
  DataSource,
  DataSourceType,
  ScrapingStatus,
  ScrapingUrl,
} from "@/types/database";
import { UrlTreeNode } from "./url-tree";
import puppeteer, { Browser, Page } from "puppeteer-core";
import chromium from "@sparticuz/chromium-min";
import {} from "@vercel/blob";

async function setupBrowser(): Promise<Browser> {
  console.log("Setting up browser...");
  try {
    const browser = await puppeteer.launch({
      args: chromium.args,
      defaultViewport: chromium.defaultViewport,
      executablePath: await chromium.executablePath(
        "https://aqpdvnrua2f6oqww.public.blob.vercel-storage.com/chromium-v127.0.0-pack-uaPJmN9v8R49eS10SNpev9xRI0Yqaz.tar"
      ),
      //   executablePath: await chromium.executablePath(
      //     "https://github.com/Sparticuz/chromium/releases/download/v127.0.0/chromium-v127.0.0-pack.tar"
      //   ),
      headless: chromium.headless,
    });

    console.log("Browser setup complete.");
    return browser;
  } catch (error) {
    console.error("Error setting up browser:", error);
    throw error;
  }
}

// async function setupBrowser(): Promise<Browser> {
//   return puppeteer.launch({
//     headless: true,
//     args: [
//       "--no-sandbox",
//       "--disable-setuid-sandbox",
//       "--disable-dev-shm-usage",
//     ],
//     defaultViewport: null,
//   });
// }

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

async function crawlUrlWithRetry(
  url: string,
  page: Page,
  startUrl: string,
  settings: CrawlerSettings,
  maxRetries = 3
): Promise<{ links: string[]; content: string }> {
  const baseUrl = getBaseUrl(startUrl);
  const basePath = getBasePath(startUrl);

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`Attempt ${attempt}: Navigating to ${url}`);

      await page.goto(url, { waitUntil: ["domcontentloaded"], timeout: 40000 });
      await page.waitForSelector("body", { timeout: 40000 });
      await autoScroll(page);
      await new Promise((resolve) => globalThis.setTimeout(resolve, 3000));

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
    } catch (error) {
      console.error(`Error crawling ${url} (Attempt ${attempt}):`, error);
      if (attempt === maxRetries) {
        console.error(`Max retries reached for ${url}`);
        return { links: [], content: "" };
      }
      await new Promise((resolve) => globalThis.setTimeout(resolve, 3000));
    }
  }
  return { links: [], content: "" };
}

async function isScrapingCancelled(scrapingRunId: number): Promise<boolean> {
  const result = await sql`
    SELECT COUNT(*) as count
    FROM scraping_url
    WHERE scraping_run_id = ${scrapingRunId} AND status = ${ScrapingStatus.CANCELLED}
  `;
  return result.rows[0].count > 0;
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

function getBaseUrl(url: string): string {
  const parsedUrl = new URL(url);
  return `${parsedUrl.protocol}//${parsedUrl.hostname}`;
}

function getBasePath(url: string): string {
  const parsedUrl = new URL(url);
  return parsedUrl.pathname.split("/").slice(0, 2).join("/");
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
        INSERT INTO scraping_url (scraping_run_id, url, status)
        VALUES (${scrapingRunId}, ${url}, ${ScrapingStatus.QUEUED})
      `;
    }
  });

  await Promise.all(addUrlPromises);
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

    // Start the initial scraper
    scrapeUrlsBatch(scrapingRunId, startUrl, settings).catch(console.error);

    return { success: true, scrapingRunId, dataSourceId };
  } catch (error) {
    console.error("Error starting scraper:", error);
    return { success: false, error: "Failed to start scraping" };
  }
}

async function scrapeUrlsBatch(
  scrapingRunId: number,
  startUrl: string,
  settings: CrawlerSettings
) {
  const pgClient = await db.connect();
  const browser = await setupBrowser();
  const page = await setupPage(browser);

  const startTime = Date.now();
  const timeoutDuration = 50000;

  try {
    while (Date.now() - startTime < timeoutDuration) {
      const isCancelled = await checkIfCancelled(pgClient, scrapingRunId);
      if (isCancelled) {
        console.log(
          `Scraping run ${scrapingRunId} has been cancelled. Stopping scraping.`
        );
        await cancelScrapingRun(scrapingRunId);
        return;
      }

      const processingCount = await getProcessingUrlsCount(
        pgClient,
        scrapingRunId
      );
      if (processingCount >= MAX_CONCURRENT_PROCESSING) {
        console.log(
          `Max concurrent processing reached. Stopping this scraper.`
        );
        return;
      }

      const nextUrl = await getNextUrlToCrawl(pgClient, scrapingRunId);
      if (!nextUrl) {
        console.log(
          `No more URLs to crawl for run ${scrapingRunId}. Stopping this scraper.`
        );
        return;
      }

      if (processingCount < MAX_CONCURRENT_PROCESSING - 1) {
        console.log("Triggering additional scraper");
        scrapeUrlsBatch(scrapingRunId, startUrl, settings).catch(console.error);
      }

      const { links: discoveredUrls, content } = await crawlUrlWithRetry(
        nextUrl.url,
        page,
        startUrl,
        settings
      );

      await Promise.all([
        addUrlsToScrape(pgClient, scrapingRunId, discoveredUrls),
        updateUrlStatus(pgClient, nextUrl.id, ScrapingStatus.COMPLETED),
        saveScrapedContent(pgClient, nextUrl.id, content),
      ]);
    }
  } catch (error) {
    console.error("Crawling failed:", error);
  } finally {
    pgClient.release();
    await browser.close();
  }
}

async function checkIfCancelled(
  client: VercelPoolClient,
  scrapingRunId: number
): Promise<boolean> {
  const result = await client.sql`
    SELECT COUNT(*) as count
    FROM scraping_url
    WHERE scraping_run_id = ${scrapingRunId} AND status = ${ScrapingStatus.CANCELLED}
  `;
  return result.rows[0].count > 0;
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

async function getNextUrlToCrawl(
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

  // Count the number of QUEUED status
  const incompleteCount = urls.filter(
    (url) =>
      url.status === ScrapingStatus.QUEUED ||
      url.status === ScrapingStatus.PROCESSING
  ).length;
  const isComplete = incompleteCount === 0;

  console.log("is complete", isComplete);

  return { treeData: root, isComplete };
}
