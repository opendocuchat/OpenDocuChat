"use client";

import { useState } from "react";
import { IndexingProgress } from "../api/index/add/repo/route";

export default function IndexingPage() {
  const [url, setUrl] = useState("");
  const [message, setMessage] = useState("");
  const [progress, setProgress] = useState<IndexingProgress | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage("Indexing...");
    setProgress(null);

    try {
      const response = await fetch("/api/index/add/repo", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ repoUrl: url }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { value, done } = await reader!.read();
        if (done) break;
        const chunk = decoder.decode(value);
        const lines = chunk.split("\n\n");
        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const data = JSON.parse(line.slice(6));
            if (data.error) {
              setMessage(`Error: ${data.error}`);
            } else {
              setProgress(data);
              if (data.stage === "complete") {
                setMessage(
                  `Indexing complete. Processed ${data.processedFiles} files. Total tokens: ${data.totalTokens}`
                );
              }
            }
          }
        }
      }
    } catch (error) {
      console.error("Error:", error);
      setMessage("Error: Failed to connect to the server");
    }
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">GitHub Repo Indexing</h1>
      <form onSubmit={handleSubmit} className="mb-4">
        <input
          type="text"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="Enter GitHub repo URL"
          className="w-full p-2 border rounded"
        />
        <button
          type="submit"
          className="mt-2 px-4 py-2 bg-blue-500 text-white rounded"
        >
          Index Repo
        </button>
      </form>
      {message && <p className="text-lg mb-4">{message}</p>}
      {progress && (
        <div className="mb-4">
          <p className="text-sm mb-2">
            {progress.stage === "counting"
              ? `Counting files: Found ${progress.totalFiles} files`
              : `Processing files: ${progress.processedFiles} of ${progress.totalFiles}`}
          </p>
          <div className="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700">
            <div
              className="bg-blue-600 h-2.5 rounded-full"
              style={{
                width: `${
                  (progress.processedFiles / progress.totalFiles) * 100
                }%`,
              }}
            ></div>
          </div>
          <p className="text-sm mt-2">
            Progress:{" "}
            {((progress.processedFiles / progress.totalFiles) * 100).toFixed(2)}
            %
          </p>
          <p className="text-sm">Total tokens: {progress.totalTokens}</p>
        </div>
      )}
    </div>
  );
}
