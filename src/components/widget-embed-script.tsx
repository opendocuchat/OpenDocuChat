'use client'

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';

export function WidgetEmbedScript() {
  const [widgetUrl, setWidgetUrl] = useState('');

  useEffect(() => {
    let url;
    const isProduction = process.env.NEXT_PUBLIC_VERCEL_ENV === 'production';
    
    if (isProduction) {
      url = process.env.NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL 
        ? `https://${process.env.NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL}`
        : null;
    } else {
      url = process.env.NEXT_PUBLIC_VERCEL_BRANCH_URL 
        ? `https://${process.env.NEXT_PUBLIC_VERCEL_BRANCH_URL}`
        : null;
    }    
    if (!url && process.env.NEXT_PUBLIC_VERCEL_URL) {
      url = `https://${process.env.NEXT_PUBLIC_VERCEL_URL}`;
    }
    url = url || window.location.origin;

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