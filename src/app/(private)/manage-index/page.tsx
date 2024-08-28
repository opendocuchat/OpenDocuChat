import GitHubRepoIndexing from "./_github-repo/ui";
import DocuScraper from "./_docu-scraper/ui";
import DataSources from "./_data_sources/ui";
import DocumentIndex from "./_document-index/ui";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function ManageIndexPage() {
  return (
    <div>
      <h1 className="text-4xl font-bold mb-3">Manage Index</h1>
      <h2 className="text-xl mb-10">
        View, add and edit sources for your chatbot search index.
      </h2>
      <DocumentIndex />
      <hr className="my-10" />
      <DataSources />
      <hr className="my-10" />
      <Card>
        <CardHeader>
          <CardTitle>Add New Documents</CardTitle>
        </CardHeader>
        <CardContent>
          <DocuScraper />
          <hr className="my-10" />
          <GitHubRepoIndexing />
        </CardContent>
      </Card>
    </div>
  );
}
