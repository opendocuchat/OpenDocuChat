'use client'

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';

export function WidgetEmbedScript() {
  const [widgetUrl, setWidgetUrl] = useState('');

  useEffect(() => {
    // In a real deployment, VERCEL_URL will be set
    // For local development, we'll use a fallback
    const url = process.env.NEXT_PUBLIC_VERCEL_URL
      ? `https://${process.env.NEXT_PUBLIC_VERCEL_URL}`
      : 'http://localhost:3000';
    setWidgetUrl(`${url}/widget`);
  }, []);

  const embedScript = `
<script>
(function() {
    var iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.bottom = '20px';
    iframe.style.right = '20px';
    iframe.style.width = '300px';
    iframe.style.height = '400px';
    iframe.style.border = 'none';
    iframe.style.zIndex = '9999';
    iframe.src = '${widgetUrl}';
    document.body.appendChild(iframe);
})();
</script>`.trim();

  const copyToClipboard = () => {
    navigator.clipboard.writeText(embedScript).then(() => {
      alert('Script copied to clipboard!');
    });
  };

  return (
    <div className="bg-gray-100 p-4 rounded-md">
      <pre className="whitespace-pre-wrap overflow-x-auto">
        <code>{embedScript}</code>
      </pre>
      <Button onClick={copyToClipboard} className="mt-4">
        Copy to Clipboard
      </Button>
    </div>
  );
}