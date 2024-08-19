// src/app/api/repo/structure/route.ts
import { NextRequest, NextResponse } from 'next/server';
import JSZip from "jszip";

interface TreeNode {
  name: string;
  path: string;
  type: 'file' | 'directory';
  children?: TreeNode[];
}

function buildFileTree(files: JSZip.JSZipObject[]): TreeNode {
  const root: TreeNode = { name: 'root', path: '/', type: 'directory', children: [] };

  files.forEach(file => {
    const pathParts = file.name.split('/');
    let currentNode = root;

    pathParts.forEach((part, index) => {
      if (index === pathParts.length - 1) {
        // This is a file
        currentNode.children = currentNode.children || [];
        currentNode.children.push({
          name: part,
          path: file.name,
          type: 'file'
        });
      } else {
        let child = currentNode.children?.find(c => c.name === part);
        if (!child) {
          child = { name: part, path: pathParts.slice(0, index + 1).join('/'), type: 'directory', children: [] };
          currentNode.children = currentNode.children || [];
          currentNode.children.push(child);
        }
        currentNode = child;
      }
    });
  });

  return root;
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

  try {
    const defaultBranch = await getDefaultBranch(repoUrl);
    const zipUrl = `${repoUrl}/archive/refs/heads/${defaultBranch}.zip`;

    const response = await fetch(zipUrl);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const arrayBuffer = await response.arrayBuffer();

    const zip = await JSZip.loadAsync(arrayBuffer);
    const files = Object.values(zip.files).filter(file => !file.dir);
    const fileTree = buildFileTree(files);

    return NextResponse.json({ fileTree });
  } catch (error: any) {
    console.error(`Error fetching repository structure: ${error.message}`);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}