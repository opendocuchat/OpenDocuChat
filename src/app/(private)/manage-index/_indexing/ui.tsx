// app/(private)/manage-index/_indexing/ui.tsx

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { getUrlContentTokenCount } from "./actions";

interface IndexingUiProps {
  selectedUrlIds: number[];
  onIndexingComplete: () => void;
}

interface IndexingProgress {
  stage: "estimating" | "indexing" | "completed" | null;
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
  const [progress, setProgress] = useState<IndexingProgress>({
    stage: null,
    totalFiles: 0,
    processedFiles: 0,
    totalTokens: 0,
  });
  const [costEstimate, setCostEstimate] = useState<number | null>(null);
  const [tokenEstimate, setTokenEstimate] = useState<number | null>(null);

  useEffect(() => {
    if (selectedUrlIds.length > 0) {
      estimateCost();
    } else {
      // Reset progress and estimates when no URLs are selected
      setProgress({
        stage: null,
        totalFiles: 0,
        processedFiles: 0,
        totalTokens: 0,
      });
      setCostEstimate(null);
      setTokenEstimate(null);
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
      const estimatedCost = (totalTokens / 1000000) * COST_PER_1M_TOKENS;

      setCostEstimate(estimatedCost);
      setTokenEstimate(totalTokens);
      setProgress({
        stage: null,
        totalFiles: selectedUrlIds.length,
        processedFiles: selectedUrlIds.length,
        totalTokens,
      });
    } catch (error) {
      console.error("Error estimating cost:", error);
      setProgress({
        stage: null,
        totalFiles: 0,
        processedFiles: 0,
        totalTokens: 0,
      });
    } finally {
      setIsEstimating(false);
    }
  };

  const handleIndexSelectedUrls = async () => {
    setIsIndexing(true);
    setProgress({
      stage: "indexing",
      totalFiles: selectedUrlIds.length,
      processedFiles: 0,
      totalTokens: tokenEstimate || 0,
    });

    const batchSize = 10;
    const batches = Array(Math.ceil(selectedUrlIds.length / batchSize))
      .fill(0)
      .map((_, index) =>
        selectedUrlIds.slice(index * batchSize, (index + 1) * batchSize)
      );

    try {
      await Promise.all(
        batches.map(async (batch) => {
          const result = await fetch("/api/indexing", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(batch),
          });

          if (result.ok) {
            setProgress((prev) => ({
              ...prev,
              processedFiles: prev.processedFiles + batch.length,
            }));
          } else {
            console.error(
              "Indexing failed for batch:",
              batch,
              result.statusText
            );
          }
        })
      );

      console.log("Indexing successful");
      setProgress((prev) => ({ ...prev, stage: "completed" }));
    } catch (error) {
      console.error("Error during indexing:", error);
      setProgress((prev) => ({ ...prev, stage: null }));
    } finally {
      setIsIndexing(false);
      onIndexingComplete();
    }
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
          <div className="mb-2">
            <p>Estimated indexing cost: ${costEstimate.toFixed(10)}</p>
            <p>Estimated tokens: {tokenEstimate}</p>
          </div>
        ) : null}
        <Button
          onClick={handleIndexSelectedUrls}
          disabled={isIndexing || isEstimating || selectedUrlIds.length === 0}
        >
          {isIndexing ? "Indexing..." : "Start Indexing"}
        </Button>

        {(progress.stage === "estimating" ||
          progress.stage === "indexing" ||
          progress.stage === "completed") && (
          <Card className="mt-4">
            <CardHeader>
              <CardTitle>
                {progress.stage === "estimating"
                  ? "Estimation"
                  : progress.stage === "indexing"
                  ? "Indexing"
                  : "Completed"}{" "}
                Status
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm mb-2">
                {progress.stage === "estimating"
                  ? `Estimating cost: ${progress.processedFiles} of ${progress.totalFiles} files processed`
                  : progress.stage === "indexing"
                  ? `Indexing: ${progress.processedFiles} of ${progress.totalFiles} files processed`
                  : `Indexing completed: ${progress.processedFiles} of ${progress.totalFiles} files processed`}
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
