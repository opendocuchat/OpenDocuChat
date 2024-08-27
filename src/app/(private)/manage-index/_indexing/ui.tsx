import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { getUrlContentTokenCount, indexScrapingUrls } from "./actions";

interface IndexingUiProps {
  selectedUrlIds: number[];
  onIndexingComplete: () => void;
}

interface IndexingProgress {
  stage: "estimating" | "indexing" | "completed";
  totalFiles: number;
  processedFiles: number;
  totalTokens: number;
}

const COST_PER_1M_TOKENS = 0.016;

export default function IndexingUI({
  selectedUrlIds,
  onIndexingComplete,
}: IndexingUiProps) {
  const [isEstimating, setIsEstimating] = useState(false);
  const [isIndexing, setIsIndexing] = useState(false);
  const [progress, setProgress] = useState<IndexingProgress | null>(null);
  const [costEstimate, setCostEstimate] = useState<number | null>(null);

  useEffect(() => {
    if (selectedUrlIds.length > 0) {
      estimateCost();
    }
  }, [selectedUrlIds]);

  const estimateCost = async () => {
    setIsEstimating(true);
    setProgress({
      stage: "estimating",
      totalFiles: selectedUrlIds.length,
      processedFiles: 0,
      totalTokens: 0,
    });

    try {
      const totalTokens = await getUrlContentTokenCount(selectedUrlIds);
      const estimatedCost = (totalTokens / 1000*1000) * COST_PER_1M_TOKENS;

      setCostEstimate(estimatedCost);
      setProgress((prev) => ({
        ...prev!,
        stage: "completed",
        processedFiles: selectedUrlIds.length,
        totalTokens,
      }));
    } catch (error) {
      console.error("Error estimating cost:", error);
    } finally {
      setIsEstimating(false);
    }
  };

  const handleIndexSelectedUrls = async () => {
    setIsIndexing(true);
    setProgress((prev) => ({ ...prev!, stage: "indexing", processedFiles: 0 }));


    const result = await indexScrapingUrls(selectedUrlIds);
    if (result.success) {
      console.log(result.message);
    } else {
      console.error("Indexing failed:", result.message);
    }

    setIsIndexing(false);
    setProgress((prev) => ({ ...prev!, stage: "completed" }));
    onIndexingComplete();
  };

  return (
    <Card className="my-4">
      <CardHeader>
        <CardTitle>Indexing</CardTitle>
      </CardHeader>
      <CardContent>
        <h2 className="text-xl font-semibold mb-2">File Selection</h2>
        <p className="mb-2">Selected files: {selectedUrlIds.length}</p>
        {isEstimating ? (
          <p>Estimating cost...</p>
        ) : costEstimate !== null ? (
          <p className="mb-2">
            Estimated indexing cost: ${costEstimate.toFixed(4)}
          </p>
        ) : null}
        <Button
          onClick={handleIndexSelectedUrls}
          disabled={isIndexing || isEstimating || selectedUrlIds.length === 0}
        >
          {isIndexing ? "Indexing..." : "Start Indexing"}
        </Button>

        {progress && (
          <Card className="mt-4">
            <CardHeader>
              <CardTitle>
                {progress.stage === "estimating" ? "Estimation" : "Indexing"}{" "}
                Status
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm mb-2">
                {progress.stage === "estimating"
                  ? `Estimating cost: ${progress.processedFiles} of ${progress.totalFiles} files processed`
                  : `Indexing: ${progress.processedFiles} of ${progress.totalFiles} files processed`}
              </p>
              <Progress
                value={(progress.processedFiles / progress.totalFiles) * 100}
              />
              <p className="text-sm mt-2">
                Progress:{" "}
                {(
                  (progress.processedFiles / progress.totalFiles) *
                  100
                ).toFixed(2)}
                %
              </p>
              <p className="text-sm">Total tokens: {progress.totalTokens}</p>
            </CardContent>
          </Card>
        )}
      </CardContent>
    </Card>
  );
}
