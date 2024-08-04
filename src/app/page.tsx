import { WidgetEmbedScript } from '@/components/widget-embed-script';

export default function Home() {
  return (
    <main className="p-8">
      <h1 className="text-3xl font-bold mb-4">Welcome to OpenDocuChat</h1>
      <p className="mb-4">
        To embed the chat widget in your application, copy and paste the following script into your HTML. The Script URL is generated based on your deployment URL.
      </p>
      <WidgetEmbedScript />
      <div className="mt-8">
        <h2 className="text-2xl font-bold mb-2">Instructions</h2>
        <ol className="list-decimal list-inside">
          <li>Copy the script above</li>
          <li>Paste it into your HTML file where you want the chat widget to appear</li>
          <li>The chat widget will automatically load on your page</li>
        </ol>
      </div>
      {/* TODO: Add login functionality */}
    </main>
  )
}