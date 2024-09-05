"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { getSystemPrompt, updateSystemPrompt } from "./actions";

export default function Page() {
  const [url, setUrl] = useState("");
  const [embedScript, setEmbedScript] = useState("");
  const [systemPrompt, setSystemPrompt] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [message, setMessage] = useState({ type: "", content: "" });

  useEffect(() => {
    const generatedUrl =
      window.location.hostname === "localhost"
        ? "http://localhost:3000/chat-widget-local.js"
        : `https://${process.env.NEXT_PUBLIC_VERCEL_URL}/chat-widget-loader.js`;

    setUrl(generatedUrl);
    setEmbedScript(`<script src="${generatedUrl}" async/>`);
    fetchSystemPrompt();
  }, []);

  const fetchSystemPrompt = async () => {
    try {
      const prompt = await getSystemPrompt();
      setSystemPrompt(prompt);
    } catch (error) {
      console.error("Error fetching system prompt:", error);
      setMessage({ type: "error", content: "Error fetching system prompt" });
    }
  };

  const handleUpdateSystemPrompt = async () => {
    try {
      await updateSystemPrompt(systemPrompt);
      setMessage({
        type: "success",
        content: "System prompt updated successfully",
      });
      setIsEditing(false);
    } catch (error) {
      setMessage({ type: "error", content: "Error updating system prompt" });
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(embedScript).then(() => {
      setMessage({ type: "success", content: "Script copied to clipboard!" });
    });
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-8">
      <h1 className="text-3xl font-bold">Chat Widget Test Page</h1>

      <Card>
        <CardHeader>
          <CardTitle>Instructions</CardTitle>
        </CardHeader>
        <CardContent>
          <ol className="list-decimal list-inside">
            <li>Copy the embed script above</li>
            <li>
              Paste it into your HTML file where you want the chat widget to
              appear
            </li>
            <li>The chat widget will automatically load on your page</li>
          </ol>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Embed Script</CardTitle>
        </CardHeader>
        <CardContent>
          <pre className="bg-gray-100 p-4 rounded-md overflow-x-auto">
            <code>{embedScript}</code>
          </pre>
        </CardContent>
        <CardFooter>
          <Button onClick={copyToClipboard}>Copy to Clipboard</Button>
        </CardFooter>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>System Prompt Management</CardTitle>
        </CardHeader>
        <CardContent>
          {isEditing ? (
            <Textarea
              value={systemPrompt}
              onChange={(e) => setSystemPrompt(e.target.value)}
              className="mb-4"
              rows={6}
            />
          ) : (
            <p className="mb-4">{systemPrompt}</p>
          )}
        </CardContent>
        <CardFooter>
          {isEditing ? (
            <>
              <Button onClick={handleUpdateSystemPrompt} className="mr-2">
                Save
              </Button>
              <Button variant="outline" onClick={() => setIsEditing(false)}>
                Cancel
              </Button>
            </>
          ) : (
            <Button onClick={() => setIsEditing(true)}>Edit</Button>
          )}
        </CardFooter>
      </Card>

      {message.content && (
        <Alert variant={message.type === "error" ? "destructive" : "default"}>
          <AlertDescription>{message.content}</AlertDescription>
        </Alert>
      )}

      {url && <script src={url} async />}
    </div>
  );
}
