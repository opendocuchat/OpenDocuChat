"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  startDocuScraper,
  fetchScrapingResults,
  isScrapingComplete,
  cancelScrapingRun,
} from "./actions";
import { TreeNode } from "./actions";
import FileTree from "./file-tree";

export default function DocuScraper() {
  const [url, setUrl] = useState("");
  const [crawlSettings, setCrawlSettings] = useState({
    stayOnDomain: true,
    stayOnPath: true,
  });
  const [scrapingRunId, setScrapingRunId] = useState<number | null>(null);
  const [treeData, setTreeData] = useState<TreeNode | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const discoverUrls = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    try {
      const result = await startDocuScraper(url, crawlSettings);
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
      const results = await fetchScrapingResults(scrapingRunId);
      setTreeData(results);

      const complete = await isScrapingComplete(scrapingRunId);
      if (complete) {
        console.log("Scraping complete");
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
        await new Promise((resolve) => setTimeout(resolve, 10000));
        await fetchResults();
        setIsLoading(false);
      } catch (err) {
        console.error("Error cancelling scraping run:", err);
        setError("Failed to cancel scraping run");
      }
    }
  };

  useEffect(() => {
    let intervalId: NodeJS.Timeout;

    if (scrapingRunId && isLoading) {
      fetchResults();
      intervalId = setInterval(fetchResults, 5000);
    }

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [scrapingRunId, isLoading]);

  const handleSelectionChange = (selectedPaths: string[]) => {
    console.log("Selected paths:", selectedPaths);
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
              <CardTitle>Documentation URL</CardTitle>
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
                <Label>Crawl Settings</Label>
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
              </div>
              {error && <p className="text-red-500 mt-2">{error}</p>}
            </CardContent>
          </Card>

          {treeData && (
            <Card>
              <CardHeader>
                <CardTitle>Discovered URLs</CardTitle>
                {isLoading && <p>Discovering URLs... Please wait.</p>}
              </CardHeader>
              <CardContent>
                {isLoading && (
                  <Button onClick={handleCancelScrapingRun} className="mb-4">
                    Cancel Scraping Run
                  </Button>
                )}
                <FileTree
                  tree={treeData}
                  onSelectionChange={handleSelectionChange}
                  isLoading={isLoading}
                />
              </CardContent>
            </Card>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
