"use client";

import React, { useState } from "react";
import { ChevronDown, ChevronRight, File, Folder } from "lucide-react";
import { Button } from "../ui/button";
import { Checkbox } from "../ui/checkbox";

export interface TreeNode {
  name: string;
  path: string;
  type: "file" | "directory";
  children?: TreeNode[];
  selected: boolean;
  expanded?: boolean;
}

interface FileTreeProps {
  initialTree: TreeNode;
  onSelectionChange: (selectedPaths: string[]) => void;
}

export const FileTree: React.FC<FileTreeProps> = ({
  initialTree,
  onSelectionChange,
}) => {
  const [tree, setTree] = useState<TreeNode>(initialTree);

  const handleToggle = (path: string) => {
    const updateNode = (node: TreeNode): TreeNode => {
      if (node.path === path) {
        return { ...node, expanded: !node.expanded };
      }
      if (node.children) {
        return { ...node, children: node.children.map(updateNode) };
      }
      return node;
    };
    setTree(updateNode(tree));
  };

  const handleSelect = (path: string, selected: boolean) => {
    const updateNode = (node: TreeNode): TreeNode => {
      if (node.path === path || (path === "/" && node.path === "")) {
        return {
          ...node,
          selected,
          children: node.children
            ? node.children.map((child) => updateNode({ ...child, selected }))
            : undefined,
        };
      }
      if (node.children) {
        const updatedChildren = node.children.map((child) =>
          child.path.startsWith(path)
            ? updateNode({ ...child, selected })
            : updateNode(child)
        );
        return { ...node, children: updatedChildren };
      }
      return node;
    };
    const updatedTree = updateNode(tree);
    setTree(updatedTree);
    onSelectionChange(getSelectedPaths(updatedTree));
  };

  const FileTreeNode: React.FC<{
    node: TreeNode;
    depth: number;
  }> = ({ node, depth }) => {
    return (
      <div style={{ marginLeft: `${depth * 14}px` }}>
        <div className="flex items-center space-x-2">
          {node.type === "directory" ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleToggle(node.path)}
              className="p-0 h-6 w-6"
            >
              {node.expanded ? (
                <ChevronDown size={16} />
              ) : (
                <ChevronRight size={16} />
              )}
            </Button>
          ) : (
            <div className="w-6"></div>
          )}
          {node.type === "directory" ? (
            <Folder size={16} />
          ) : (
            <File size={16} />
          )}
          <Checkbox
            id={node.path}
            checked={node.selected}
            onCheckedChange={(checked) =>
              handleSelect(node.path, checked as boolean)
            }
          />
          <label htmlFor={node.path} className="text-sm">
            {node.name}
          </label>
        </div>
        {node.expanded && node.children && (
          <div>
            {node.children.map((child) => (
              <FileTreeNode key={child.path} node={child} depth={depth + 1} />
            ))}
          </div>
        )}
      </div>
    );
  };

  return <FileTreeNode node={tree} depth={0} />;
};

export const getSelectedPaths = (node: TreeNode): string[] => {
  if (node.selected) return [node.path];
  if (node.children) {
    return node.children.flatMap(getSelectedPaths);
  }
  return [];
};

export const addSelectionToTree = (node: TreeNode): TreeNode => {
  return {
    ...node,
    selected: false,
    expanded: node.type === "directory",
    children: node.children ? node.children.map(addSelectionToTree) : undefined,
  };
};