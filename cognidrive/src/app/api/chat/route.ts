import { NextRequest, NextResponse } from "next/server";
import { callOpenRouter } from "@/lib/openrouter";
import { retrieveRelevantChunks } from "@/lib/rag";
import { createServerClient } from "@/lib/supabase/client";
import type { AIModel } from "@/types";

export async function POST(request: NextRequest) {
  try {
    const { message, fileId, model, history } = await request.json();

    if (!message) {
      return NextResponse.json({ error: "Message is required" }, { status: 400 });
    }

    let context = "";
    if (fileId) {
      const chunks = await retrieveRelevantChunks(fileId, message);
      context = chunks.join("\n\n---\n\n");

      if (!context) {
        const supabase = createServerClient();
        const { data: file } = await supabase
          .from("files")
          .select("content_text")
          .eq("id", fileId)
          .single();
        context = file?.content_text?.slice(0, 8000) ?? "";
      }
    }

    const systemPrompt = context
      ? `You are CogniDrive, an intelligent document assistant. Answer questions based on the following document context. If the answer is not in the context, say so clearly.\n\nDOCUMENT CONTEXT:\n${context}`
      : "You are CogniDrive, an intelligent document assistant. Help the user with their questions.";

    const messages = [
      { role: "system" as const, content: systemPrompt },
      ...(history ?? []).slice(-10),
      { role: "user" as const, content: message },
    ];

    const reply = await callOpenRouter({
      model: (model as AIModel) || "openai/gpt-4o",
      messages,
      temperature: 0.7,
      maxTokens: 2048,
    });

    return NextResponse.json({ reply });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Chat failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
