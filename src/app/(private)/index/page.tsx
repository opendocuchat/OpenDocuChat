import GitHubRepoIndexing from "./github-repo-form";
import DocuScraper from "./docu-scraper-form";

export default function ManageIndexPage() {
  return (
    <div>
      <h1 className="text-4xl font-bold mb-3">Manage Index</h1>
      <h2 className="text-xl font-semibold mb-10">Add and edit sources for your chatbot search index.</h2>
      <DocuScraper />
      <hr className="my-8" />
      <GitHubRepoIndexing />
    </div>
  );
}
