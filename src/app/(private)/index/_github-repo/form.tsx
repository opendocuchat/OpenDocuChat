"use client";

import React, { useState } from "react";
import { IndexingProgress } from "../../../api/repo/add/route";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  FileTree,
  addSelectionToTree,
  TreeNode,
  getSelectedPaths,
} from "./file-tree-node";

export default function GitHubRepoIndexing() {
  const [url, setUrl] = useState("");
  const [message, setMessage] = useState("");
  const [progress, setProgress] = useState<IndexingProgress | null>(null);
  const [indexingStrategy, setIndexingStrategy] = useState("full");
  const [fileTypes, setFileTypes] = useState<string[]>([
    ".js",
    ".py",
    ".md",
    ".txt",
  ]);
  const [repoStructure, setRepoStructure] = useState<TreeNode | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage("Indexing...");
    setProgress(null);

    try {
      const response = await fetch("/api/repo/add", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          repoUrl: url,
          indexingStrategy,
          fileTypes,
          selectedPaths: repoStructure ? getSelectedPaths(repoStructure) : [],
        }),
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
              if (data.stage === "completed") {
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

  const fetchRepoStructure = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage("Fetching repository structure...");
    try {
      const response = await fetch("/api/repo/structure", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ repoUrl: url }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      if (data.error) {
        setMessage(`Error: ${data.error}`);
      } else {
        setRepoStructure(addSelectionToTree(data.fileTree));
        setMessage("Repository structure fetched. Select files to index.");
      }
    } catch (error) {
      console.error("Error:", error);
      setMessage("Error: Failed to fetch repository structure");
    }
  };

  return (
    <div>
      <Card className="my-4">
        <CardHeader>
          <CardTitle>
            GitHub Repo Indexing
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Card className="mb-4">
            <CardHeader>
              <CardTitle>Repository URL</CardTitle>
            </CardHeader>
            <CardContent>
              <form
                onSubmit={fetchRepoStructure}
                className="flex items-center space-x-2"
              >
                <Input
                  type="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="Enter GitHub repo URL"
                  className="flex-grow"
                />
                <Button type="submit">Fetch Structure</Button>
              </form>
            </CardContent>
          </Card>

          {repoStructure && (
            <Card className="mb-4">
              <CardHeader>
                <CardTitle>Repository Structure</CardTitle>
              </CardHeader>
              <CardContent>
                <FileTree
                  initialTree={repoStructure}
                  onSelectionChange={(selectedPaths) => {
                    // Update your state or perform any action with the selected paths
                    console.log("Selected paths:", selectedPaths);
                  }}
                />
              </CardContent>
            </Card>
          )}

          <Card className="mb-4">
            <CardHeader>
              <CardTitle>Indexing Options</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="mb-4">
                <Label>Indexing Strategy</Label>
                <Select
                  value={indexingStrategy}
                  onValueChange={setIndexingStrategy}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select indexing strategy" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="smart">Smart Defaults</SelectItem>
                    <SelectItem value="full">Full Repository</SelectItem>
                    <SelectItem value="sample">Sample Repository</SelectItem>
                    <SelectItem value="incremental">
                      Incremental Indexing
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>File Types to Include</Label>
                <div className="flex flex-wrap gap-2">
                  {[".js", ".py", ".md", ".txt", ".html", ".css"].map(
                    (type) => (
                      <div key={type} className="flex items-center space-x-2">
                        <Checkbox
                          id={type}
                          checked={fileTypes.includes(type)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setFileTypes([...fileTypes, type]);
                            } else {
                              setFileTypes(fileTypes.filter((t) => t !== type));
                            }
                          }}
                        />
                        <Label htmlFor={type}>{type}</Label>
                      </div>
                    )
                  )}
                </div>
              </div>

              <Button onClick={handleSubmit} className="mt-4">
                Start Indexing
              </Button>
            </CardContent>
          </Card>

          {message && <p className="text-lg mb-4">{message}</p>}
          {progress && (
            <Card className="mb-4">
              <CardHeader>
                <CardTitle>Indexing Status</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm mb-2">
                  {progress.stage === "counting"
                    ? `Counting files: Found ${progress.totalFiles} files`
                    : `Processing files: ${progress.processedFiles} of ${progress.totalFiles}`}
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
    </div>
  );
}
