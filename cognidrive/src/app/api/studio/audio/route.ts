import { NextRequest, NextResponse } from "next/server";
import { callOpenRouter } from "@/lib/openrouter";
import { generateTTSAudio, parseTranscriptScript } from "@/lib/tts";
import { createServerClient } from "@/lib/supabase/client";
import type { AIModel } from "@/types";

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

    const scriptRaw = await callOpenRouter({
      model: (model as AIModel) || "openai/gpt-4o",
      messages: [
        {
          role: "system",
          content: `You are a podcast script writer. Create a conversational two-speaker podcast transcript summarizing the key insights from the document. Use exactly two speakers: "Host A" and "Host B". Make it engaging, informative, and about 8-12 exchanges.

Return ONLY valid JSON in this format:
{
  "lines": [
    { "speaker": "Host A", "text": "..." },
    { "speaker": "Host B", "text": "..." }
  ]
}`,
        },
        {
          role: "user",
          content: `Document title: ${file.name}\n\nContent:\n${docText}`,
        },
      ],
      temperature: 0.8,
      maxTokens: 3000,
      jsonMode: true,
    });

    const lines = parseTranscriptScript(scriptRaw);

    if (lines.length === 0) {
      return NextResponse.json(
        { error: "Failed to generate transcript" },
        { status: 500 }
      );
    }

    const audioBuffer = await generateTTSAudio(lines);
    const base64Audio = Buffer.from(audioBuffer).toString("base64");

    return NextResponse.json({
      transcript: lines,
      audio: base64Audio,
      mimeType: "audio/mpeg",
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Audio generation failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
