"use client";

import { useCallback, useState, useEffect } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  type Node,
  type Edge,
  Handle,
  Position,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { Button } from "@/components/ui/button";
import { Network, Loader2, ChevronDown, ChevronRight } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import type { AIModel, MindMapNode, StoredFile } from "@/types";

interface MindMapViewProps {
  file: StoredFile | null;
  model: AIModel;
}

function MindMapNodeComponent({ data }: { data: { label: string; collapsed?: boolean; hasChildren?: boolean; onToggle?: () => void } }) {
  return (
    <div className="px-4 py-2 shadow-md rounded-lg bg-white border-2 border-primary/20 min-w-[120px]">
      <Handle type="target" position={Position.Top} className="!bg-primary" />
      <div className="flex items-center gap-1">
        {data.hasChildren && (
          <button onClick={data.onToggle} className="p-0.5 hover:bg-muted rounded">
            {data.collapsed ? (
              <ChevronRight className="h-3 w-3" />
            ) : (
              <ChevronDown className="h-3 w-3" />
            )}
          </button>
        )}
        <span className="text-sm font-medium">{data.label}</span>
      </div>
      <Handle type="source" position={Position.Bottom} className="!bg-primary" />
    </div>
  );
}

const nodeTypes = { mindmap: MindMapNodeComponent };

function layoutTree(
  root: MindMapNode,
  collapsed: Set<string>,
  onToggle: (id: string) => void,
  x = 0,
  y = 0,
  level = 0
): { nodes: Node[]; edges: Edge[]; width: number } {
  const nodes: Node[] = [];
  const edges: Edge[] = [];
  const hasChildren = !!(root.children && root.children.length > 0);
  const isCollapsed = collapsed.has(root.id);

  nodes.push({
    id: root.id,
    type: "mindmap",
    position: { x, y },
    data: {
      label: root.label,
      collapsed: isCollapsed,
      hasChildren,
      onToggle: () => onToggle(root.id),
    },
  });

  if (hasChildren && !isCollapsed) {
    const childSpacing = 220;
    const startX = x - ((root.children!.length - 1) * childSpacing) / 2;
    root.children!.forEach((child, i) => {
      const childX = startX + i * childSpacing;
      const childY = y + 120;
      const result = layoutTree(child, collapsed, onToggle, childX, childY, level + 1);
      nodes.push(...result.nodes);
      edges.push(...result.edges);
      edges.push({
        id: `${root.id}-${child.id}`,
        source: root.id,
        target: child.id,
        animated: true,
        style: { stroke: "hsl(var(--primary))", strokeWidth: 2 },
      });
    });
  }

  return { nodes, edges, width: 0 };
}

export function MindMapView({ file, model }: MindMapViewProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [mindMap, setMindMap] = useState<MindMapNode | null>(null);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);

  const handleToggle = useCallback((id: string) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const generate = async () => {
    if (!file) return;
    setIsGenerating(true);
    toast({ title: "Generating mind map...", description: "Analyzing document structure" });

    try {
      const res = await fetch("/api/studio/mindmap", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileId: file.id, model }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setMindMap(data.mindMap);
      setCollapsed(new Set());
      toast({ title: "Mind map ready" });
    } catch (err) {
      toast({
        title: "Generation failed",
        description: err instanceof Error ? err.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  useEffect(() => {
    if (!mindMap) return;
    const { nodes: n, edges: e } = layoutTree(mindMap, collapsed, handleToggle, 400, 50);
    setNodes(n);
    setEdges(e);
  }, [mindMap, collapsed, handleToggle, setNodes, setEdges]);

  if (!file) {
    return (
      <div className="flex h-full items-center justify-center text-muted-foreground">
        <p className="text-sm">Select a document to generate a mind map</p>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-2">
          <Network className="h-5 w-5 text-primary" />
          <h3 className="font-semibold">Interactive Mind Map</h3>
        </div>
        <Button onClick={generate} disabled={isGenerating}>
          {isGenerating ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              Generating...
            </>
          ) : (
            "Generate Mind Map"
          )}
        </Button>
      </div>

      <div className="flex-1 bg-muted/20">
        {mindMap ? (
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            nodeTypes={nodeTypes}
            fitView
            minZoom={0.2}
            maxZoom={2}
          >
            <Background />
            <Controls />
            <MiniMap />
          </ReactFlow>
        ) : (
          <div className="flex h-full items-center justify-center text-muted-foreground">
            <Network className="h-16 w-16 opacity-20" />
          </div>
        )}
      </div>
    </div>
  );
}
