"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AudioOverview } from "./audio-overview";
import { MindMapView } from "./mind-map-view";
import { DataTableExtractor } from "./data-table-extractor";
import { Headphones, Network, Table2, Sparkles } from "lucide-react";
import type { AIModel, StoredFile } from "@/types";

interface StudioToolsProps {
  file: StoredFile | null;
  model: AIModel;
}

export function StudioTools({ file, model }: StudioToolsProps) {
  return (
    <div className="flex h-full flex-col">
      <div className="border-b px-4 py-3">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          <div>
            <h2 className="font-semibold">Studio Tools</h2>
            <p className="text-xs text-muted-foreground">
              NotebookLM-style intelligence for{" "}
              {file ? file.name : "your documents"}
            </p>
          </div>
        </div>
      </div>

      <Tabs defaultValue="audio" className="flex-1 flex flex-col">
        <TabsList className="mx-4 mt-3 grid w-auto grid-cols-3">
          <TabsTrigger value="audio" className="gap-1.5">
            <Headphones className="h-3.5 w-3.5" />
            Audio
          </TabsTrigger>
          <TabsTrigger value="mindmap" className="gap-1.5">
            <Network className="h-3.5 w-3.5" />
            Mind Map
          </TabsTrigger>
          <TabsTrigger value="table" className="gap-1.5">
            <Table2 className="h-3.5 w-3.5" />
            Data Table
          </TabsTrigger>
        </TabsList>

        <TabsContent value="audio" className="flex-1 mt-0 overflow-hidden">
          <AudioOverview file={file} model={model} />
        </TabsContent>
        <TabsContent value="mindmap" className="flex-1 mt-0 overflow-hidden">
          <MindMapView file={file} model={model} />
        </TabsContent>
        <TabsContent value="table" className="flex-1 mt-0 overflow-hidden">
          <DataTableExtractor file={file} model={model} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
