import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const { scrapingRunId, startUrl, settings } = await request.json();
  console.log("Started scrape/start");
  const url = `${
    process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000"
  }/api/scrape/process`;
  await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ scrapingRunId, startUrl, settings }),
  }).catch(console.error);

  return NextResponse.json({
    success: true,
    message: "Scraping process started",
  });
}
