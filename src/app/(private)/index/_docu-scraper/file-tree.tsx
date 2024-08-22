import React from "react";
import { TreeNode } from "./actions";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrapingStatus } from '@/types/database';

interface FileTreeProps {
  tree: TreeNode;
  onSelectionChange: (selectedPaths: string[]) => void;
  isLoading: boolean;
}

const FileTree: React.FC<FileTreeProps> = ({ tree, onSelectionChange, isLoading }) => {
  const handleCheckboxChange = (node: TreeNode, checked: boolean) => {
    node.selected = checked;
    if (node.children) {
      node.children.forEach((child) => handleCheckboxChange(child, checked));
    }
    const selectedPaths = getSelectedPaths(tree);
    onSelectionChange(selectedPaths);
  };

  const getStatusColor = (status: ScrapingStatus) => {
    switch (status) {
      case ScrapingStatus.QUEUED: return 'text-yellow-500';
      case ScrapingStatus.PROCESSING: return 'text-blue-500';
      case ScrapingStatus.COMPLETED: return 'text-green-500';
      case ScrapingStatus.CANCELLED: return 'text-red-500';
      case ScrapingStatus.FAILED: return 'text-red-700';
      default: return 'text-gray-500';
    }
  };

  const renderTree = (node: TreeNode) => (
    <div key={node.path} className="ml-4">
      <div className="flex items-center justify-between py-1">
        <div className="flex items-center">
          <Checkbox
            id={node.path}
            checked={!!node.selected}
            onCheckedChange={(checked) => handleCheckboxChange(node, Boolean(checked))}
            // disabled={isLoading}
          />
          <label htmlFor={node.path} className="ml-2 truncate">
            {node.name.split(' (')[0]}
          </label>
        </div>
        {node.status && (
          <span className={`ml-2 ${getStatusColor(node.status)}`}>
            {node.status}
          </span>
        )}
      </div>
      {node.children && node.expanded && (
        <div className="ml-4">
          {node.children.map((childNode) => renderTree(childNode))}
        </div>
      )}
    </div>
  );

  const getSelectedPaths = (node: TreeNode): string[] => {
    let paths: string[] = [];
    if (node.selected) {
      paths.push(node.path);
    }
    if (node.children) {
      node.children.forEach((child) => {
        paths = [...paths, ...getSelectedPaths(child)];
      });
    }
    return paths;
  };

  return renderTree(tree);
};

export default FileTree;