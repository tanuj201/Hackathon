import { NextRequest, NextResponse } from "next/server";
import { callOpenRouter } from "@/lib/openrouter";
import { retrieveRelevantChunks } from "@/lib/rag";
import { createServerClient, getConfigStatus } from "@/lib/supabase/client";
import { getAuthUserId } from "@/lib/supabase/server";
import { checkChatAllowed, incrementUsage } from "@/lib/usage";
import type { AIModel } from "@/types";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const userId = await getAuthUserId();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const chatCheck = await checkChatAllowed(userId);
    if (!chatCheck.allowed) {
      return NextResponse.json({ error: chatCheck.error }, { status: 429 });
    }

    const config = getConfigStatus();
    if (!config.openrouter) {
      return NextResponse.json(
        { error: "OPENROUTER_API_KEY is not configured." },
        { status: 503 }
      );
    }

    const { message, fileId, model, history } = await request.json();

    if (!message) {
      return NextResponse.json({ error: "Message is required" }, { status: 400 });
    }

    let context = "";
    if (fileId) {
      const supabase = createServerClient();
      const { data: ownedFile } = await supabase
        .from("files")
        .select("content_text")
        .eq("id", fileId)
        .eq("user_id", userId)
        .single();

      if (!ownedFile) {
        return NextResponse.json({ error: "Document not found" }, { status: 404 });
      }

      try {
        const chunks = await retrieveRelevantChunks(fileId, message);
        context = chunks.join("\n\n---\n\n");
      } catch {
        // RAG optional
      }

      if (!context) {
        context = ownedFile.content_text?.slice(0, 12000) ?? "";
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
      model: (model as AIModel) || "google/gemini-2.5-flash",
      messages,
      temperature: 0.7,
      maxTokens: 2048,
    });

    await incrementUsage(userId, "chat_count");

    return NextResponse.json({ reply });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Chat failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
