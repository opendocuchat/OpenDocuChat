"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { ArrowLeft, Loader2 } from "lucide-react";
import {
  DataSource,
  ScrapingRun,
  ScrapingStatus,
  ScrapingUrl,
} from "@/types/database";
import { useState, useCallback } from "react";
import UrlTree, { UrlTreeNode } from "../_docu-scraper/url-tree";
import { fetchScrapingResultsAndStatus } from "../_docu-scraper/actions";
import { getDataSources, getScrapingRunsAndUrls } from "./actions";
import IndexingUI from "../_indexing/ui";

export default function DataSources() {
  const [dataSources, setDataSources] = useState<DataSource[]>([]);
  const [isLoadingDataSources, setIsLoadingDataSources] = useState(false);
  const [selectedDataSource, setSelectedDataSource] =
    useState<DataSource | null>(null);
  const [scrapingRuns, setScrapingRuns] = useState<ScrapingRun[]>([]);
  const [scrapingUrlDetails, setScrapingUrlDetails] = useState<
    Record<number, ScrapingUrl[]>
  >({});
  const [isLoading, setIsLoading] = useState(false);
  const [selectedRun, setSelectedRun] = useState<ScrapingRun | null>(null);
  const [fileTree, setFileTree] = useState<UrlTreeNode | null>(null);
  const [isLoadingFileTree, setIsLoadingFileTree] = useState(false);
  const [showIndexingUI, setShowIndexingUI] = useState(false);
  const [selectedUrls, setSelectedUrls] = useState<
    { url: string; id: number }[]
  >([]);

  const handleIndexingComplete = () => {
    console.log("Indexing completed");
    setShowIndexingUI(false);
  };

  const handleSelectionChange = (
    selectedPaths: { url: string; id: number }[]
  ) => {
    setSelectedUrls(selectedPaths);
  };

  const showDataSources = async () => {
    setIsLoadingDataSources(true);
    const dataSources = await getDataSources();
    setDataSources(dataSources);
    setIsLoadingDataSources(false);
  };

  const handleDataSourceClick = async (dataSource: DataSource) => {
    setSelectedDataSource(dataSource);
    if (dataSource.type === "docu_scrape") {
      setIsLoading(true);
      setScrapingRuns([]);
      setScrapingUrlDetails({});
      try {
        const { runs, urlDetails } = await getScrapingRunsAndUrls(
          dataSource.id
        );
        setScrapingRuns(runs);
        setScrapingUrlDetails(urlDetails);
      } catch (error) {
        console.error("Error fetching scraping runs and URLs:", error);
      } finally {
        setIsLoading(false);
      }
    }
  };

  const getUrlStatusCounts = (urls: ScrapingUrl[]) => {
    const counts: Record<ScrapingStatus, number> = {
      QUEUED: 0,
      PROCESSING: 0,
      CANCELLED: 0,
      COMPLETED: 0,
      FAILED: 0,
    };
    urls.forEach((url) => counts[url.status]++);
    return counts;
  };

  const handleRunClick = useCallback(async (run: ScrapingRun) => {
    setSelectedRun(run);
    setIsLoadingFileTree(true);
    try {
      const { treeData } = await fetchScrapingResultsAndStatus(run.id);
      setFileTree(treeData);
    } catch (error) {
      console.error("Error fetching file tree:", error);
    } finally {
      setIsLoadingFileTree(false);
    }
  }, []);

  const handleBackClick = useCallback(() => {
    setSelectedRun(null);
    setFileTree(null);
  }, []);

  return (
    <Card>
      <CardHeader>
        <CardTitle>View Data Sources</CardTitle>
      </CardHeader>
      <CardContent>
        <Button
          onClick={showDataSources}
          disabled={isLoadingDataSources}
          className="mb-4"
        >
          Load Data Sources
          {isLoadingDataSources ? (
            <Loader2 className="h-4 w-4 animate-spin ml-2" />
          ) : null}
        </Button>

        {dataSources.length > 0 && (
          <Table>
            <TableCaption>List of Data Sources</TableCaption>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>URL</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {dataSources.map((dataSource) => (
                <TableRow key={dataSource.id}>
                  <TableCell>{dataSource.id}</TableCell>
                  <TableCell>
                    <Sheet>
                      <SheetTrigger asChild>
                        <Button
                          variant="link"
                          onClick={() => handleDataSourceClick(dataSource)}
                        >
                          {dataSource.name}
                        </Button>
                      </SheetTrigger>
                      <SheetContent
                        className={`max-w-4/5 sm:max-w-4/5 overflow-y-auto`}
                      >
                        <SheetHeader>
                          <div className="flex items-center justify-between">
                            <SheetTitle>{dataSource.name} Details</SheetTitle>
                            {selectedRun && (
                              <Button
                                variant="outline"
                                onClick={handleBackClick}
                              >
                                <ArrowLeft className="mr-2 h-4 w-4" /> Back to
                                Runs
                              </Button>
                            )}
                          </div>
                          <SheetDescription>
                            {dataSource.type === "docu_scrape"
                              ? "Scraping Runs"
                              : "Repository Details"}
                          </SheetDescription>
                        </SheetHeader>
                        {dataSource.type === "docu_scrape" &&
                          (isLoading ? (
                            <div className="flex justify-center items-center h-40">
                              <Loader2 className="h-8 w-8 animate-spin" />
                            </div>
                          ) : selectedRun ? (
                            isLoadingFileTree ? (
                              <div className="flex justify-center items-center h-40">
                                <Loader2 className="h-8 w-8 animate-spin" />
                              </div>
                            ) : (
                              <div>
                                <UrlTree
                                  tree={fileTree!}
                                  onSelectionChange={handleSelectionChange}
                                  // onSelectionChange={() => {}}
                                  isLoading={isLoadingFileTree}
                                />

                                <Button
                                  onClick={() => setShowIndexingUI(true)}
                                  disabled={
                                    selectedUrls.length === 0 || isLoading
                                  }
                                >
                                  Proceed to Indexing
                                </Button>

                                <IndexingUI
                                  selectedUrlIds={selectedUrls.map((u) => u.id)}
                                  onIndexingComplete={handleIndexingComplete}
                                />
                              </div>
                            )
                          ) : (
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead>ID</TableHead>
                                  <TableHead>Start Time</TableHead>
                                  <TableHead>Total URLs</TableHead>
                                  <TableHead>Status Breakdown</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {scrapingRuns.map((run) => {
                                  const urls = scrapingUrlDetails[run.id] || [];
                                  const statusCounts = getUrlStatusCounts(urls);
                                  return (
                                    <TableRow key={run.id}>
                                      <TableCell>{run.id}</TableCell>
                                      <TableCell>
                                        <Button
                                          variant="link"
                                          onClick={() => handleRunClick(run)}
                                        >
                                          {run.created_at.toLocaleString()}
                                        </Button>
                                      </TableCell>
                                      <TableCell>{urls.length}</TableCell>
                                      <TableCell>
                                        {Object.entries(statusCounts).map(
                                          ([status, count]) => (
                                            <div key={status}>
                                              {status}: {count}
                                            </div>
                                          )
                                        )}
                                      </TableCell>
                                    </TableRow>
                                  );
                                })}
                              </TableBody>
                            </Table>
                          ))}
                      </SheetContent>
                    </Sheet>
                  </TableCell>
                  <TableCell>{dataSource.type}</TableCell>
                  <TableCell>{dataSource.url}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
