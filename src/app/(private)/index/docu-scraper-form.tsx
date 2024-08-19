"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";

export default function DocuScraper() {
  const [url, setUrl] = useState("");
  const [crawlSettings, setCrawlSettings] = useState<string[]>([
    "stay on subdomain",
    "stay on domain",
    "limit maximum page number",
    "limit maximum depth",
  ]);

  const discoverUrls = async (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: Add calls to docu scraper server actions
  };

  return (
    <div>
      <h2 className="text-2xl font-bold mb-4">Documentation Scraper</h2>

      <Card className="mb-4">
        <CardHeader>
          <CardTitle>How the Documentation Scraper works</CardTitle>
        </CardHeader>
        <CardContent>
          <ol className="list-decimal list-inside">
            <li>
              Use the crawler to discover documentation URLs: Enter a start URL
              (https://docs.example.com) and optionally configure crawler
              settings.
            </li>
            <li>
              Review the discovered URLs and choose which pages to scrape and
              index. IMPORTANT: This step will cause embeddings costs, which are
              projected and displayed after the URL discovery and selection.
            </li>
          </ol>
        </CardContent>
      </Card>

      <Card className="mb-4">
        <CardHeader>
          <CardTitle>Documentation URL</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={discoverUrls} className="flex items-center space-x-2">
            <Input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="Enter documentation website URL"
              className="flex-grow"
            />
            <Button type="submit">Discover URLs</Button>
          </form>

          <div className="mt-4">
            <Label>Crawl Settings</Label>
            <ul className="list-item list-inside">
              {[
                "stay on subdomain",
                "stay on domain",
                "limit maximum page number",
                "limit maximum depth",
              ].map((type) => (
                <div key={type} className="flex items-center space-x-2 py-1">
                  <Checkbox
                    id={type}
                    checked={crawlSettings.includes(type)}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        setCrawlSettings([...crawlSettings, type]);
                      } else {
                        setCrawlSettings(
                          crawlSettings.filter((t) => t !== type)
                        );
                      }
                    }}
                  />
                  <Label htmlFor={type}>{type}</Label>
                </div>
              ))}
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
