import { NextRequest, NextResponse } from "next/server";
import { callOpenRouter } from "@/lib/openrouter";
import { getStudioFileAccess, recordStudioUsage } from "@/lib/studio-access";
import type { AIModel, MindMapNode } from "@/types";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const { fileId, model } = await request.json();

    if (!fileId) {
      return NextResponse.json({ error: "fileId is required" }, { status: 400 });
    }

    const access = await getStudioFileAccess(fileId);
    if (!access.ok) {
      return NextResponse.json({ error: access.error }, { status: access.status });
    }

    const { userId, file } = access;
    const docText = file.content_text.slice(0, 12000);

    const raw = await callOpenRouter({
      model: (model as AIModel) || "openai/gpt-4o",
      messages: [
        {
          role: "system",
          content: `You are a knowledge graph expert. Analyze the document and produce a hierarchical mind map as JSON.

STRICT OUTPUT FORMAT — return ONLY valid JSON:
{
  "id": "root",
  "label": "Document Title or Main Topic",
  "children": [
    {
      "id": "unique-id-1",
      "label": "Concept Name",
      "children": [
        { "id": "unique-id-1a", "label": "Sub-concept" }
      ]
    }
  ]
}

Rules:
- Root node represents the document's main theme
- 3-6 top-level branches
- Each branch may have 2-4 sub-nodes
- Labels must be concise (2-6 words)
- Every node needs a unique "id" string`,
        },
        {
          role: "user",
          content: `Document: ${file.name}\n\n${docText}`,
        },
      ],
      temperature: 0.5,
      maxTokens: 2000,
      jsonMode: true,
    });

    let mindMap: MindMapNode;
    try {
      mindMap = JSON.parse(raw);
    } catch {
      return NextResponse.json({ error: "Failed to parse mind map JSON" }, { status: 500 });
    }

    await recordStudioUsage(userId);

    return NextResponse.json({ mindMap });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Mind map generation failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
