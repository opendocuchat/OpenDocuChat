// src/app/api/index/add/repo/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { sql } from "@vercel/postgres";
import { encodingForModel } from "js-tiktoken";
import JSZip from "jszip";
import { DataSource } from '@/types/database';

export interface IndexingProgress {
  totalFiles: number;
  processedFiles: number;
  totalTokens: number;
  stage: 'counting' | 'processing' | 'completed';
}

function countTokens(text: string): number {
  const encoder = encodingForModel("gpt-3.5-turbo");
  const tokens = encoder.encode(text);
  return tokens.length;
}

function generateUniqueTimestamp(): string {
  return new Date().toISOString().replace(/[-:\.]/g, "");
}

async function processZipContents(
  zip: JSZip,
  dataSourceId: number,
  uniqueTimestamp: string,
  repoUrl: string,
  totalFiles: number,
  sendProgress: (data: string) => void
): Promise<{ indexedFiles: number; errorFiles: number; totalTokens: number }> {
  let indexedFiles = 0;
  let errorFiles = 0;
  let totalTokens = 0;

  const files = Object.values(zip.files).filter(file => !file.dir);

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    console.log(`Indexing file: ${file.name}`);
    try {
      const content = await file.async("string");
      const tokens = countTokens(content);
      
//       // TODO: Add back to store documents to db
//       // const uniqueUrl = `${repoUrl}/blob/${getDefaultBranch(repoUrl)}/${file.name}?timestamp=${uniqueTimestamp}`;
//       // await sql`
//       //   INSERT INTO document (url, content, active, metadata, data_source_id, created_at)
//       //   VALUES (
//       //     ${uniqueUrl}::TEXT, 
//       //     ${content}::TEXT, 
//       //     ${true}::BOOLEAN, 
//       //     ${JSON.stringify({ path: file.name })}::JSONB, 
//       //     ${dataSourceId}::INTEGER, 
//       //     ${currentDate}::TIMESTAMP WITH TIME ZONE
//       //   )
//       // `;

      indexedFiles++;
      totalTokens += tokens;
      console.log(`File ${file.name} indexed. Tokens: ${tokens}. Accumulated tokens: ${totalTokens}`);
      
      sendProgress(JSON.stringify({
        totalFiles,
        processedFiles: i + 1,
        totalTokens,
        stage: 'processing'
      }));
    } catch (error) {
      console.error(`Error indexing file ${file.name}:`, error);
      errorFiles++;
    }
  }

  return { indexedFiles, errorFiles, totalTokens };
}

async function getDefaultBranch(repoUrl: string): Promise<string> {
  const apiUrl = repoUrl.replace('github.com', 'api.github.com/repos');
  const response = await fetch(apiUrl);
  if (!response.ok) {
    throw new Error(`Failed to fetch repository info: ${response.statusText}`);
  }
  const data = await response.json();
  return data.default_branch;
}

export async function POST(req: NextRequest) {
  const { repoUrl } = await req.json();

  if (!repoUrl) {
    return NextResponse.json({ message: 'Repository URL is required' }, { status: 400 });
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const sendProgress = (data: string) => {
        controller.enqueue(encoder.encode(`data: ${data}\n\n`));
      };

      const uniqueTimestamp = generateUniqueTimestamp();
      const uniqueName = `${repoUrl.split('/').slice(-2).join('/')}_${uniqueTimestamp}`;

      console.log(`Starting indexing of repository: ${repoUrl}`);

      try {
        if (!process.env.POSTGRES_URL) {
          throw new Error("Database connection string is not set. Please set the POSTGRES_URL environment variable.");
        }

        const dataSourceResult = await sql<DataSource>`
          INSERT INTO data_source (name, url, type)
          VALUES (
            ${uniqueName}::TEXT, 
            ${repoUrl}::TEXT, 
            ${"public_repo"}::data_source_type
          )
          RETURNING id, name, url, type
        `;
        const dataSource = dataSourceResult.rows[0];

        console.log(`Created data source: ${dataSource.name}`);

        const defaultBranch = await getDefaultBranch(repoUrl);

        const zipUrl = `${repoUrl}/archive/refs/heads/${defaultBranch}.zip`;

        const response = await fetch(zipUrl);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const arrayBuffer = await response.arrayBuffer();

        const zip = await JSZip.loadAsync(arrayBuffer);
        
        const totalFiles = Object.values(zip.files).filter(file => !file.dir).length;
        sendProgress(JSON.stringify({
          totalFiles,
          processedFiles: 0,
          totalTokens: 0,
          stage: 'counting'
        }));

        const { indexedFiles, errorFiles, totalTokens } = await processZipContents(
          zip,
          dataSource.id,
          uniqueTimestamp,
          repoUrl,
          totalFiles,
          sendProgress
        );

        console.log(
          `Indexing complete. Successfully indexed files: ${indexedFiles}. Files with errors: ${errorFiles}. Total tokens: ${totalTokens}`
        );

        sendProgress(JSON.stringify({
          totalFiles,
          processedFiles: totalFiles,
          totalTokens,
          stage: 'completed'
        }));

        controller.close();
      } catch (error: any) {
        console.error(`Error indexing repository ${repoUrl}:`, error);
        sendProgress(JSON.stringify({ error: error.message }));
        controller.close();
      }
    }
  });

  return new NextResponse(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}