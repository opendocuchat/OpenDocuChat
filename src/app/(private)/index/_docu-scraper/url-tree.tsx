import React, { useState, useEffect } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrapingStatus } from "@/types/database";
import { ChevronDown, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { fetchUrlContent } from "./actions";

interface UrlTreeProps {
  tree: UrlTreeNode;
  onSelectionChange: (selectedPaths: string[]) => void;
  isLoading: boolean;
}

export interface UrlTreeNode {
  name: string;
  path: string;
  type: "file" | "directory";
  children?: UrlTreeNode[];
  selected: boolean;
  expanded?: boolean;
  status?: ScrapingStatus;
  scrapeUrlId?: number;
}

const UrlTree: React.FC<UrlTreeProps> = ({
  tree: initialTree,
  onSelectionChange,
  isLoading,
}) => {
  const [tree, setTree] = useState<UrlTreeNode>(initialTree);
  const [contentMap, setContentMap] = useState<Record<number, string | null>>(
    {}
  );
  const [visibleContent, setVisibleContent] = useState<Record<number, boolean>>(
    {}
  );

  useEffect(() => {
    setTree(initialTree);
  }, [initialTree]);

  const handleFetchContent = async (scrapeUrlId: number) => {
    if (contentMap[scrapeUrlId] === undefined) {
      try {
        const content = await fetchUrlContent(scrapeUrlId);
        setContentMap((prevMap) => ({ ...prevMap, [scrapeUrlId]: content }));
        setVisibleContent((prevVisible) => ({
          ...prevVisible,
          [scrapeUrlId]: true,
        }));
      } catch (error) {
        console.error("Error fetching content:", error);
        setContentMap((prevMap) => ({ ...prevMap, [scrapeUrlId]: null }));
      }
    } else {
      setVisibleContent((prevVisible) => ({
        ...prevVisible,
        [scrapeUrlId]: !prevVisible[scrapeUrlId],
      }));
    }
  };

  const handleCheckboxChange = (path: string, checked: boolean) => {
    const updateNodeAndChildren = (node: UrlTreeNode): UrlTreeNode => {
      if (node.path.startsWith(path)) {
        return {
          ...node,
          selected: checked,
          children: node.children?.map(updateNodeAndChildren),
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
    const updateNode = (node: UrlTreeNode): UrlTreeNode => {
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
      case ScrapingStatus.QUEUED:
        return "text-yellow-500";
      case ScrapingStatus.PROCESSING:
        return "text-blue-500";
      case ScrapingStatus.COMPLETED:
        return "text-green-500";
      case ScrapingStatus.CANCELLED:
        return "text-red-500";
      case ScrapingStatus.FAILED:
        return "text-red-700";
      default:
        return "text-gray-500";
    }
  };

  const renderTree = (node: UrlTreeNode, depth: number = 0) => (
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
            onCheckedChange={(checked) =>
              handleCheckboxChange(node.path, Boolean(checked))
            }
            disabled={isLoading}
          />
          <label htmlFor={node.path} className="ml-2 truncate">
            {node.path === "" ? "/" : `${node.name.split(" (")[0]}`}
          </label>
          {node.scrapeUrlId && (
            <Button
              variant="ghost"
              size="xs"
              onClick={() => handleFetchContent(node.scrapeUrlId!)}
              className="ml-2"
            >
              {contentMap[node.scrapeUrlId!] === undefined
                ? "Fetch Content"
                : visibleContent[node.scrapeUrlId!]
                ? "Hide Content"
                : "Show Content"}
            </Button>
          )}
        </div>
        {node.status && (
          <span className={`ml-2 ${getStatusColor(node.status)}`}>
            {node.status}
          </span>
        )}
      </div>
      {node.scrapeUrlId &&
        contentMap[node.scrapeUrlId] !== undefined &&
        visibleContent[node.scrapeUrlId!] && (
          <div className="ml-6 mt-2 p-2 bg-gray-100 rounded">
            <pre className="whitespace-pre-wrap">
              {contentMap[node.scrapeUrlId]}
            </pre>
          </div>
        )}
      {node.children && node.expanded !== false && (
        <div className="ml-4">
          {node.children.map((childNode) => renderTree(childNode, depth + 1))}
        </div>
      )}
    </div>
  );

  const getSelectedPaths = (node: UrlTreeNode): string[] => {
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
