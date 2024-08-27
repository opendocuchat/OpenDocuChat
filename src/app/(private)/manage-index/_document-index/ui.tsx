"use client";

import { useState, useEffect } from "react";
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
import { Loader2 } from "lucide-react";
import { Document } from "@/types/database";
import { getDocuments } from "./actions";

export default function DocumentIndex() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const loadDocuments = async () => {
    setIsLoading(true);
    try {
      const fetchedDocuments = await getDocuments();
      setDocuments(fetchedDocuments);
    } catch (error) {
      console.error("Error fetching documents:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Search Index</CardTitle>
      </CardHeader>
      <CardContent>
        <Button
          onClick={loadDocuments}
          disabled={isLoading}
          className="mb-4"
        >
          Load Documents
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin ml-2" />
          ) : null}
        </Button>

        {documents.length > 0 && (
          <Table>
            <TableCaption>List of Documents</TableCaption>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>URL</TableHead>
                <TableHead>Data Source ID</TableHead>
                <TableHead>Active</TableHead>
                <TableHead>Created At</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {documents.map((document) => (
                <TableRow key={document.id}>
                  <TableCell>{document.id}</TableCell>
                  <TableCell>{document.url}</TableCell>
                  <TableCell>{document.data_source_id}</TableCell>
                  <TableCell>{document.active ? "Yes" : "No"}</TableCell>
                  <TableCell>{document.created_at.toLocaleString()}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}