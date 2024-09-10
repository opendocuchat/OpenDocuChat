"use client";

import React, { useState, useEffect } from "react";
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
import { Loader2, Trash2 } from "lucide-react";
import { Document } from "@/types/database";
import { getDocuments, deleteDocumentsByDataSourceId } from "./actions";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";

export default function DocumentIndex() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [dataSourceIdToDelete, setDataSourceIdToDelete] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  const loadDocuments = async () => {
    setIsLoading(true);
    try {
      const fetchedDocuments = await getDocuments();
      setDocuments(fetchedDocuments);
    } catch (error) {
      console.error("Error fetching documents:", error);
      toast({
        title: "Error",
        description: "Failed to load documents. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!dataSourceIdToDelete) {
      toast({
        title: "Error",
        description: "Please enter a Data Source ID to delete.",
        variant: "destructive",
      });
      return;
    }

    setIsDeleting(true);
    try {
      await deleteDocumentsByDataSourceId(dataSourceIdToDelete);
      toast({
        title: "Success",
        description: `Documents with Data Source ID ${dataSourceIdToDelete} have been deleted.`,
      });
      loadDocuments(); // Reload the documents after deletion
      setDataSourceIdToDelete(""); // Clear the input field
    } catch (error) {
      console.error("Error deleting documents:", error);
      toast({
        title: "Error",
        description: "Failed to delete documents. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Search Index</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex space-x-2 mb-4">
          <Button onClick={loadDocuments} disabled={isLoading}>
            Load Documents
            {isLoading && <Loader2 className="h-4 w-4 animate-spin ml-2" />}
          </Button>
          <Input
            placeholder="Enter Data Source ID to delete"
            value={dataSourceIdToDelete}
            onChange={(e) => setDataSourceIdToDelete(e.target.value)}
          />
          <Button
            onClick={handleDelete}
            disabled={isDeleting || !dataSourceIdToDelete}
            variant="destructive"
          >
            Delete
            {isDeleting ? (
              <Loader2 className="h-4 w-4 animate-spin ml-2" />
            ) : (
              <Trash2 className="h-4 w-4 ml-2" />
            )}
          </Button>
        </div>

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
