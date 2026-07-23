import { NextRequest, NextResponse } from "next/server";
import { callOpenRouter } from "@/lib/openrouter";
import { createServerClient } from "@/lib/supabase/client";
import type { AIModel, ExtractedTable } from "@/types";

export async function POST(request: NextRequest) {
  try {
    const { fileId, model } = await request.json();

    if (!fileId) {
      return NextResponse.json({ error: "fileId is required" }, { status: 400 });
    }

    const supabase = createServerClient();
    const { data: file, error } = await supabase
      .from("files")
      .select("content_text, name")
      .eq("id", fileId)
      .single();

    if (error || !file?.content_text) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }

    const docText = file.content_text.slice(0, 12000);

    const raw = await callOpenRouter({
      model: (model as AIModel) || "openai/gpt-4o",
      messages: [
        {
          role: "system",
          content: `You are a data extraction specialist. Analyze the document and extract structured entities, metrics, dates, and quantitative figures into a clean table.

Return ONLY valid JSON:
{
  "columns": ["Column1", "Column2", "Column3"],
  "rows": [
    { "Column1": "value", "Column2": 123, "Column3": "2024-01-15" }
  ]
}

Rules:
- Extract 5-20 meaningful rows
- Use descriptive column names
- Include numbers, dates, names, and metrics where present
- Use null for missing values`,
        },
        {
          role: "user",
          content: `Document: ${file.name}\n\n${docText}`,
        },
      ],
      temperature: 0.3,
      maxTokens: 3000,
      jsonMode: true,
    });

    let table: ExtractedTable;
    try {
      table = JSON.parse(raw);
    } catch {
      return NextResponse.json(
        { error: "Failed to parse extracted table" },
        { status: 500 }
      );
    }

    return NextResponse.json({ table });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Table extraction failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
