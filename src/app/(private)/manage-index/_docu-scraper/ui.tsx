"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  startScrapingRun,
  cancelScrapingRun,
  fetchScrapingResultsAndStatus,
  startScraper,
  CrawlerSettings,
} from "./actions";
import UrlTree, { UrlTreeNode } from "./url-tree";
import { Slider } from "@/components/ui/slider";
import IndexingUi from "../_indexing/ui";

export default function DocuScraper() {
  const [url, setUrl] = useState("");
  const [crawlSettings, setCrawlSettings] = useState({
    stayOnDomain: true,
    stayOnPath: true,
    excludeFileTypes: ["jpg", "jpeg", "png", "gif", "mov", "mp4", "mp3"],
    maxParallelScrapers: 2,
  });
  const [scrapingRunId, setScrapingRunId] = useState<number | null>(null);
  const [treeData, setTreeData] = useState<UrlTreeNode | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [excludeFileTypesInput, setExcludeFileTypesInput] = useState(
    crawlSettings.excludeFileTypes.join(", ")
  );
  const [selectedUrls, setSelectedUrls] = useState<
    { url: string; id: number }[]
  >([]);
  const [showIndexingUI, setShowIndexingUI] = useState(false);

  const handleSelectionChange = (
    selectedPaths: { url: string; id: number }[]
  ) => {
    console.log("Selected paths:", selectedPaths);
    setSelectedUrls(selectedPaths);
  };

  const handleIndexingComplete = () => {
    console.log("Indexing completed");
    setShowIndexingUI(false);
  };

  const handleExcludeFileTypesChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const input = e.target.value;
    setExcludeFileTypesInput(input);
    const fileTypes = input
      .split(",")
      .map((type) => type.trim().toLowerCase())
      .filter(Boolean);
    setCrawlSettings((prevSettings) => ({
      ...prevSettings,
      excludeFileTypes: fileTypes,
    }));
  };

  const discoverUrls = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    try {
      const result = await startScrapingRun(url, crawlSettings);
      if ("success" in result && result.success && "scrapingRunId" in result) {
        const scrapingRunId = result.scrapingRunId as number | null;
        setScrapingRunId(scrapingRunId);
        console.log("Scraping started with ID:", scrapingRunId);
      } else if ("error" in result) {
        throw new Error((result.error as string) || "Failed to start scraping");
      } else {
        throw new Error("Unknown error");
      }
    } catch (err) {
      console.error("Error starting scraper:", err);
      setError(
        err instanceof Error ? err.message : "An unknown error occurred"
      );
      setIsLoading(false);
    }
  };

  const fetchResults = async () => {
    if (!scrapingRunId) return;

    try {
      const { treeData, isComplete } = await fetchScrapingResultsAndStatus(
        scrapingRunId
      );
      setTreeData(treeData);

      if (isComplete) {
        setIsLoading(false);
      }
    } catch (err) {
      console.error("Error fetching results:", err);
      setError("Failed to fetch scraping results");
      setIsLoading(false);
    }
  };

  const handleCancelScrapingRun = async () => {
    if (scrapingRunId) {
      try {
        await cancelScrapingRun(scrapingRunId);
        await new Promise((resolve) => setTimeout(resolve, 20000));
        await fetchResults();
        setIsLoading(false);
      } catch (err) {
        console.error("Error cancelling scraping run:", err);
        setError("Failed to cancel scraping run");
      }
    }
  };

  useEffect(() => {
    let fetchIntervalId: NodeJS.Timeout;
    let scrapeIntervalId: NodeJS.Timeout;

    if (scrapingRunId && isLoading) {
      console.log("Fetching results & starting scraper...");
      fetchResults();
      startScraper(scrapingRunId, url, crawlSettings);
      fetchIntervalId = setInterval(fetchResults, 3000);
      scrapeIntervalId = setInterval(
        () => startScraper(scrapingRunId, url, { ...crawlSettings }),
        10000
      );
    }

    return () => {
      if (fetchIntervalId) clearInterval(fetchIntervalId);
      if (scrapeIntervalId) clearInterval(scrapeIntervalId);
    };
  }, [scrapingRunId, isLoading, crawlSettings]);

  useEffect(() => {
    if (isLoading) {
      window.addEventListener("beforeunload", handleBeforeUnload);
    } else {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    }
  }, [isLoading]);

  const handleBeforeUnload = (event: BeforeUnloadEvent) => {
    event.preventDefault();
  };

  return (
    <div>
      <Card className="my-4">
        <CardHeader>
          <CardTitle>Documentation Scraper</CardTitle>
        </CardHeader>
        <CardContent>
          <Card className="mb-4">
            <CardHeader>
              <CardTitle>How the Documentation Scraper works</CardTitle>
            </CardHeader>
            <CardContent>
              <ol className="list-decimal list-inside">
                <li>
                  Use the crawler to discover documentation URLs: Enter a start
                  URL (https://docs.example.com) and optionally configure
                  crawler settings.
                </li>
                <li>
                  Review the discovered URLs and choose which pages to scrape
                  and index. IMPORTANT: This step will cause embeddings costs,
                  which are projected and displayed after the URL discovery and
                  selection.
                </li>
              </ol>
            </CardContent>
          </Card>

          <Card className="mb-4">
            <CardHeader>
              <CardTitle>Start Docu Scraper</CardTitle>
            </CardHeader>
            <CardContent>
              <form
                onSubmit={discoverUrls}
                className="flex items-center space-x-2"
              >
                <Input
                  type="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="Enter documentation website URL"
                  className="flex-grow"
                />
                <Button type="submit" disabled={isLoading}>
                  {isLoading ? "Discovering..." : "Discover URLs"}
                </Button>
              </form>

              <div className="mt-4">
                <div className="font-semibold">Crawl Settings</div>
                <div className="flex items-center space-x-2 py-1">
                  <Checkbox
                    id="stayOnDomain"
                    checked={crawlSettings.stayOnDomain}
                    onCheckedChange={(checked) => {
                      setCrawlSettings({
                        ...crawlSettings,
                        stayOnDomain: checked as boolean,
                      });
                    }}
                  />
                  <Label htmlFor="stayOnDomain">
                    Stay on domain & subdomain
                  </Label>
                </div>
                <div className="flex items-center space-x-2 py-1">
                  <Checkbox
                    id="stayOnPath"
                    checked={crawlSettings.stayOnPath}
                    onCheckedChange={(checked) => {
                      setCrawlSettings({
                        ...crawlSettings,
                        stayOnPath: checked as boolean,
                      });
                    }}
                  />
                  <Label htmlFor="stayOnPath">Stay on path</Label>
                </div>
                <div>
                  <Label htmlFor="excludeFileTypes">
                    Exclude File Types (comma-separated)
                  </Label>
                  <Input
                    id="excludeFileTypes"
                    value={excludeFileTypesInput}
                    onChange={handleExcludeFileTypesChange}
                    placeholder="e.g., jpg, png, gif"
                    className="mt-1"
                  />
                </div>

                <Label>Parallel Scrapers</Label>
                <div className="flex items-center">
                  <Slider
                    defaultValue={[crawlSettings.maxParallelScrapers]}
                    max={10}
                    step={1}
                    onChange={(e) => {
                      setCrawlSettings({
                        ...crawlSettings,
                        maxParallelScrapers: (e as unknown as number[])[0],
                      });
                    }}
                  />
                  <span className="ml-2 text-sm">
                    {crawlSettings.maxParallelScrapers}
                  </span>
                </div>
                <p className="text-sm text-gray-500">
                  Adjust the number of scrapers that can run in parallel.
                </p>
              </div>

              {error && <p className="text-red-500 mt-2">{error}</p>}
            </CardContent>
          </Card>

          {treeData && (
            <Card>
              <CardHeader>
                <CardTitle>Select URLs for indexing</CardTitle>
                {isLoading ? (
                  <p className="text-lg text-orange-500">
                    Discovering URLs... Please wait. Do NOT close or reload this
                    window, or the scraper will stop.
                  </p>
                ) : (
                  <p className="text-lg text-emerald-500">
                    Please select the URLs you want to add to your chatbot index
                  </p>
                )}
              </CardHeader>
              <CardContent>
                <Button
                  onClick={() => setShowIndexingUI(true)}
                  disabled={selectedUrls.length === 0 || isLoading}
                >
                  Proceed to Indexing
                </Button>

                {isLoading && (
                  <Button
                    onClick={handleCancelScrapingRun}
                    className="mb-4 ml-4"
                  >
                    Cancel Scraping Run
                  </Button>
                )}
                <UrlTree
                  tree={treeData}
                  onSelectionChange={handleSelectionChange}
                  isLoading={isLoading}
                />
              </CardContent>
            </Card>
          )}
          {showIndexingUI && (
            <IndexingUi
              selectedUrlIds={selectedUrls.map((u) => u.id)}
              onIndexingComplete={handleIndexingComplete}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
