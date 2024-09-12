import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  getUrlContentTokenCount,
  queueUrlsForIndexing,
  getIndexingProgress,
} from "./actions";
import { Loader2 } from "lucide-react";

interface IndexingUiProps {
  selectedUrlIds: number[];
  onIndexingComplete: () => void;
}

interface IndexingProgress {
  stage: "estimating" | "indexing" | "completed" | "no_new_urls" | null;
  totalFiles: number;
  processedFiles: number;
  totalTokens: number;
  newlyQueuedCount: number;
  alreadyIndexedCount: number;
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
    newlyQueuedCount: 0,
    alreadyIndexedCount: 0,
  });
  const [costEstimate, setCostEstimate] = useState<number | null>(null);
  const [tokenEstimate, setTokenEstimate] = useState<number | null>(null);
  const [isIndexingTriggered, setIsIndexingTriggered] = useState(false);
  const [queuedIds, setQueuedIds] = useState<number[]>([]);
  const [indexingProgress, setIndexingProgress] = useState({
    queued: 0,
    completed: 0,
  });
  const [startTime, setStartTime] = useState<number | null>(null);
  const [estimatedTimeRemaining, setEstimatedTimeRemaining] = useState<number | null>(null);

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
        newlyQueuedCount: 0,
        alreadyIndexedCount: 0,
      });
      setCostEstimate(null);
      setTokenEstimate(null);
    }
  }, [selectedUrlIds]);

  useEffect(() => {
    let progressIntervalId: NodeJS.Timeout;
    let indexingIntervalId: NodeJS.Timeout;

    const fetchProgress = async () => {
      if (isIndexingTriggered && queuedIds.length > 0) {
        const progress = await getIndexingProgress(queuedIds);
        setIndexingProgress(progress);

        if (progress.queued === 0 && progress.completed === queuedIds.length) {
          clearInterval(progressIntervalId);
          clearInterval(indexingIntervalId);
          setIsIndexing(false);
          setProgress((prev) => ({ ...prev, stage: "completed" }));
          onIndexingComplete();
        }
      }
    };

    const triggerIndexing = async () => {
      try {
        const result = await fetch("/api/indexing", {
          method: "POST",
        });

        if (result.ok) {
          console.log("Indexing triggered successfully");
        } else {
          console.error("Failed to trigger indexing:", result.statusText);
        }
      } catch (error) {
        console.error("Error triggering indexing:", error);
      }
    };

    if (isIndexingTriggered) {
      fetchProgress();
      triggerIndexing();
      progressIntervalId = setInterval(fetchProgress, 3000);
      indexingIntervalId = setInterval(triggerIndexing, 3000);
    }

    return () => {
      if (progressIntervalId) clearInterval(progressIntervalId);
      if (indexingIntervalId) clearInterval(indexingIntervalId);
    };
  }, [isIndexingTriggered, queuedIds, onIndexingComplete]);

  useEffect(() => {
    if (isIndexingTriggered) {
      setStartTime(Date.now());
    }
  }, [isIndexingTriggered]);

  useEffect(() => {
    if (startTime && indexingProgress.completed > 0) {
      const elapsedTime = (Date.now() - startTime) / 1000; // in seconds
      const averageTimePerFile = elapsedTime / indexingProgress.completed;
      const remainingFiles = progress.newlyQueuedCount - indexingProgress.completed;
      const estimatedTime = averageTimePerFile * remainingFiles;
      setEstimatedTimeRemaining(estimatedTime);
    }
  }, [startTime, indexingProgress, progress.newlyQueuedCount]);

  const estimateCost = async () => {
    setIsEstimating(true);
    setProgress({
      stage: "estimating",
      totalFiles: selectedUrlIds.length,
      processedFiles: 0,
      totalTokens: 0,
      newlyQueuedCount: 0,
      alreadyIndexedCount: 0,
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
        newlyQueuedCount: 0,
        alreadyIndexedCount: 0,
      });
    } catch (error) {
      console.error("Error estimating cost:", error);
      setProgress({
        stage: null,
        totalFiles: 0,
        processedFiles: 0,
        totalTokens: 0,
        newlyQueuedCount: 0,
        alreadyIndexedCount: 0,
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
      newlyQueuedCount: 0,
      alreadyIndexedCount: 0,
    });

    try {
      const queuedCount = await queueUrlsForIndexing(selectedUrlIds);
      const alreadyIndexedCount = selectedUrlIds.length - queuedCount;

      if (queuedCount === 0) {
        setProgress((prev) => ({
          ...prev,
          stage: "no_new_urls",
          newlyQueuedCount: 0,
          alreadyIndexedCount: selectedUrlIds.length,
        }));
        setIsIndexing(false);
        onIndexingComplete();
      } else {
        setQueuedIds(selectedUrlIds.slice(0, queuedCount));
        setIsIndexingTriggered(true);
        setProgress((prev) => ({
          ...prev,
          newlyQueuedCount: queuedCount,
          alreadyIndexedCount,
        }));
      }
    } catch (error) {
      console.error("Error starting indexing process:", error);
      setProgress((prev) => ({ ...prev, stage: null }));
      setIsIndexing(false);
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
          {isIndexing ? "Indexing" : "Start Indexing"}
          {isIndexing && <Loader2 className="h-4 w-4 animate-spin ml-2" />}
        </Button>

        {progress.stage === "no_new_urls" && (
          <p className="mt-2 text-yellow-600">
            All selected URLs ({progress.alreadyIndexedCount}) were already
            indexed. No new indexing required.
          </p>
        )}

        {(isIndexing || progress.stage === "completed") && (
          <Card className="mt-4">
            <CardHeader>
              <CardTitle className="flex items-center">
                Indexing Progress
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm mb-2">
                Indexing: {indexingProgress.completed} of{" "}
                {progress.newlyQueuedCount} new files processed
              </p>
              <Progress
                value={
                  (indexingProgress.completed / progress.newlyQueuedCount) * 100
                }
              />
              <p className="text-sm mt-2">
                Progress:{" "}
                {(
                  (indexingProgress.completed / progress.newlyQueuedCount) *
                  100
                ).toFixed(2)}
                %
              </p>
              {estimatedTimeRemaining !== null && (
                <p className="text-sm mt-2">
                  Estimated time remaining: {Math.round(estimatedTimeRemaining / 60)} minutes
                </p>
              )}
              {progress.alreadyIndexedCount > 0 && (
                <p className="text-sm mt-2 text-gray-600">
                  {progress.alreadyIndexedCount} URLs were already indexed and
                  skipped.
                </p>
              )}
              {progress.stage === "completed" && (
                <p className="text-sm mt-2 text-green-600 font-semibold">
                  Indexing completed successfully!
                </p>
              )}
              {isIndexing && (
                <div className="flex items-center mt-2">
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  <span className="text-sm">Indexing in progress...</span>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </CardContent>
    </Card>
  );
}
