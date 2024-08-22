import GitHubRepoIndexing from "./_github-repo/form";
import DocuScraper from "./_docu-scraper/form";
import ManageIndex from "./_manage-index/form";

export default function ManageIndexPage() {
  return (
    <div>
      <h1 className="text-4xl font-bold mb-3">Manage Index</h1>
      <h2 className="text-xl mb-10">View, add and edit sources for your chatbot search index.</h2>
      <ManageIndex />
      <DocuScraper />
      <GitHubRepoIndexing />
    </div>
  );
}
