import { NextRequest, NextResponse } from "next/server";
import { callOpenRouter } from "@/lib/openrouter";
import {
  generateTTSAudio,
  parseTranscriptScript,
  hasTtsConfigured,
} from "@/lib/tts";
import { getConfigStatus } from "@/lib/supabase/client";
import { getStudioFileAccess, recordStudioUsage } from "@/lib/studio-access";
import type { AIModel } from "@/types";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const config = getConfigStatus();
    if (!config.openrouter) {
      return NextResponse.json({ error: "OPENROUTER_API_KEY is not configured." }, { status: 503 });
    }

    const { fileId, model } = await request.json();

    if (!fileId) {
      return NextResponse.json({ error: "fileId is required" }, { status: 400 });
    }

    const access = await getStudioFileAccess(fileId);
    if (!access.ok) {
      return NextResponse.json({ error: access.error }, { status: access.status });
    }

    const { userId, file } = access;
    const docText = file.content_text.slice(0, 10000);

    const scriptRaw = await callOpenRouter({
      model: (model as AIModel) || "openai/gpt-4o",
      messages: [
        {
          role: "system",
          content: `You are a podcast script writer. Create a conversational two-speaker podcast transcript summarizing the key insights from the document. Use exactly two speakers: "Host A" and "Host B". Make it engaging, informative, and about 6-10 short exchanges.

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
      maxTokens: 2500,
      jsonMode: true,
    });

    const lines = parseTranscriptScript(scriptRaw);

    if (lines.length === 0) {
      return NextResponse.json(
        { error: "Failed to generate transcript. Try again or switch AI model." },
        { status: 500 }
      );
    }

    await recordStudioUsage(userId);

    if (hasTtsConfigured()) {
      try {
        const audioBuffer = await generateTTSAudio(lines);
        const base64Audio = Buffer.from(audioBuffer).toString("base64");
        return NextResponse.json({
          transcript: lines,
          audio: base64Audio,
          mimeType: "audio/mpeg",
          mode: "server-tts",
        });
      } catch (ttsErr) {
        return NextResponse.json({
          transcript: lines,
          audio: null,
          mode: "browser-tts",
          warning:
            ttsErr instanceof Error
              ? `Server TTS failed (${ttsErr.message}). Using browser speech instead.`
              : "Server TTS failed. Using browser speech instead.",
        });
      }
    }

    return NextResponse.json({
      transcript: lines,
      audio: null,
      mode: "browser-tts",
      warning:
        "No TTS API key set — using browser speech. Add OPENAI_API_KEY in Vercel for MP3 download.",
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Audio generation failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
