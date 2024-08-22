import React, { useState, useEffect } from 'react';
import { TreeNode } from './actions';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrapingStatus } from '@/types/database';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface UrlTreeProps {
  tree: TreeNode;
  onSelectionChange: (selectedPaths: string[]) => void;
  isLoading: boolean;
}

const UrlTree: React.FC<UrlTreeProps> = ({ tree: initialTree, onSelectionChange, isLoading }) => {
  const [tree, setTree] = useState<TreeNode>(initialTree);

  useEffect(() => {
    setTree(initialTree);
  }, [initialTree]);

  const handleCheckboxChange = (path: string, checked: boolean) => {
    const updateNodeAndChildren = (node: TreeNode): TreeNode => {
      if (node.path.startsWith(path)) {
        return {
          ...node,
          selected: checked,
          children: node.children?.map(updateNodeAndChildren)
        };
      }
      if (node.children) {
        return {
          ...node,
          children: node.children.map(updateNodeAndChildren),
        };
      }
      return node;
    };

    const updatedTree = updateNodeAndChildren(tree);
    setTree(updatedTree);
    const selectedPaths = getSelectedPaths(updatedTree);
    onSelectionChange(selectedPaths);
  };

  const toggleExpand = (path: string) => {
    const updateNode = (node: TreeNode): TreeNode => {
      if (node.path === path) {
        return { ...node, expanded: !node.expanded };
      }
      if (node.children) {
        return {
          ...node,
          children: node.children.map(updateNode),
        };
      }
      return node;
    };
    setTree(updateNode(tree));
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

  const renderTree = (node: TreeNode, depth: number = 0) => (
    <div key={node.path} className={`ml-${depth * 4}`}>
      <div className="flex items-center justify-between py-1">
        <div className="flex items-center">
          {node.children && node.children.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => toggleExpand(node.path)}
              className="p-0 h-6 w-6 mr-1"
            >
              {node.expanded !== false ? (
                <ChevronDown size={16} />
              ) : (
                <ChevronRight size={16} />
              )}
            </Button>
          )}
          {!node.children && <div className="w-6 mr-1" />}
          <Checkbox
            id={node.path}
            checked={!!node.selected}
            onCheckedChange={(checked) => handleCheckboxChange(node.path, Boolean(checked))}
            disabled={isLoading}
          />
          <label htmlFor={node.path} className="ml-2 truncate">
            {node.path === '' ? '/' : `${node.name.split(' (')[0]}`}
          </label>
        </div>
        {node.status && (
          <span className={`ml-2 ${getStatusColor(node.status)}`}>
            {node.status}
          </span>
        )}
      </div>
      {node.children && node.expanded !== false && (
        <div className="ml-4">
          {node.children.map((childNode) => renderTree(childNode, depth + 1))}
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

export default UrlTree;