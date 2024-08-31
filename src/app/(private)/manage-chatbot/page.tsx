"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";

const Page = () => {
  const [url, setUrl] = useState("");
  const [embedScript, setEmbedScript] = useState("");

  useEffect(() => {
    const generatedUrl =
      window.location.hostname === "localhost"
        ? "http://localhost:3000/chat-widget.js"
        : `https://${process.env.VERCEL_ENV === "production"
          ? process.env.VERCEL_PROJECT_PRODUCTION_URL
          : process.env.VERCEL_ENV === "preview"
          ? process.env.VERCEL_BRANCH_URL
          : process.env.VERCEL_URL}/chat-widget.js`;

    setUrl(generatedUrl);
    setEmbedScript(`<script src="${generatedUrl}" async/>`);
  }, []);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(embedScript).then(() => {
      alert("Script copied to clipboard!");
    });
  };

  //   //TODO: add toggle to see production vs development url

  //   //TODO: add toggle to see widget in darkmode

  return (
    <div>
      <h1 className="font-bold text-base">
        Welcome to the Chat Widget Test Page
      </h1>
      <p>
        This page demonstrates the embedded chat widget. You should see a chat
        button in the bottom right corner.
      </p>

      <p className="mb-4">
        To embed the chat widget in your application, copy and paste the
        following script into your HTML. The Script URL is generated based on
        your deployment URL. To see the deployment URL, visit this page in your
        deployed production page, not localhost.
      </p>
      <div className="bg-gray-100 p-4 rounded-md">
        <pre className="whitespace-pre-wrap overflow-x-auto">
          <code>{embedScript}</code>
        </pre>
        <Button onClick={copyToClipboard} className="mt-4">
          Copy to Clipboard
        </Button>
      </div>
      <div className="mt-8">
        <h2 className="text-2xl font-bold mb-2">Instructions</h2>
        <ol className="list-decimal list-inside">
          <li>Copy the script above</li>
          <li>
            Paste it into your HTML file where you want the chat widget to
            appear
          </li>
          <li>The chat widget will automatically load on your page</li>
        </ol>
      </div>

      {url && <script src={url} async />}
    </div>
  );
};

export default Page;
