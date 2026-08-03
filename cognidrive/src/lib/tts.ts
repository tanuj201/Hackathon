import type { AudioTranscriptLine } from "@/types";

export function hasTtsConfigured(): boolean {
  const eleven = process.env.ELEVENLABS_API_KEY;
  const openai = process.env.OPENAI_API_KEY;
  return !!(
    (eleven && !eleven.includes("your-elevenlabs") && !eleven.includes("your_")) ||
    (openai && !openai.includes("your-openai") && !openai.includes("your_"))
  );
}

export async function generateTTSAudio(
  lines: AudioTranscriptLine[]
): Promise<ArrayBuffer> {
  const elevenLabsKey = process.env.ELEVENLABS_API_KEY;
  const openaiKey = process.env.OPENAI_API_KEY;

  const validEleven =
    elevenLabsKey &&
    !elevenLabsKey.includes("your-elevenlabs") &&
    !elevenLabsKey.includes("your_");
  const validOpenAI =
    openaiKey &&
    !openaiKey.includes("your-openai") &&
    !openaiKey.includes("your_");

  // Cap lines to avoid Vercel timeouts (each line = 1 API call)
  const limited = lines.slice(0, 10);

  if (validEleven) {
    return generateElevenLabsAudio(limited, elevenLabsKey!);
  }

  if (validOpenAI) {
    return generateOpenAIAudio(limited, openaiKey!);
  }

  throw new Error(
    "No TTS provider configured. Set ELEVENLABS_API_KEY or OPENAI_API_KEY in Vercel Environment Variables and redeploy."
  );
}

async function generateElevenLabsAudio(
  lines: AudioTranscriptLine[],
  apiKey: string
): Promise<ArrayBuffer> {
  const voiceA = "pNInz6obpgDQGcFmaJgB"; // Adam
  const voiceB = "EXAVITQu4vr4xnSDxMaL"; // Bella

  const audioBuffers: ArrayBuffer[] = [];

  for (const line of lines) {
    const voiceId = line.speaker === "Host A" ? voiceA : voiceB;
    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
      {
        method: "POST",
        headers: {
          "xi-api-key": apiKey,
          "Content-Type": "application/json",
          Accept: "audio/mpeg",
        },
        body: JSON.stringify({
          text: line.text.slice(0, 2500),
          model_id: "eleven_monolingual_v1",
          voice_settings: { stability: 0.5, similarity_boost: 0.75 },
        }),
      }
    );

    if (!response.ok) {
      const errText = await response.text().catch(() => "");
      throw new Error(
        `ElevenLabs TTS error (${response.status}): ${errText.slice(0, 200) || "check your API key"}`
      );
    }

    audioBuffers.push(await response.arrayBuffer());
  }

  return concatAudioBuffers(audioBuffers);
}

async function generateOpenAIAudio(
  lines: AudioTranscriptLine[],
  apiKey: string
): Promise<ArrayBuffer> {
  const audioBuffers: ArrayBuffer[] = [];

  for (const line of lines) {
    const voice = line.speaker === "Host A" ? "onyx" : "nova";
    const response = await fetch("https://api.openai.com/v1/audio/speech", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "tts-1",
        input: line.text.slice(0, 2500),
        voice,
        response_format: "mp3",
      }),
    });

    if (!response.ok) {
      const errText = await response.text().catch(() => "");
      throw new Error(
        `OpenAI TTS error (${response.status}): ${errText.slice(0, 200) || "check your API key"}`
      );
    }

    audioBuffers.push(await response.arrayBuffer());
  }

  return concatAudioBuffers(audioBuffers);
}

function concatAudioBuffers(buffers: ArrayBuffer[]): ArrayBuffer {
  const totalLength = buffers.reduce((sum, b) => sum + b.byteLength, 0);
  const combined = new Uint8Array(totalLength);
  let offset = 0;
  for (const buf of buffers) {
    combined.set(new Uint8Array(buf), offset);
    offset += buf.byteLength;
  }
  return combined.buffer;
}

export function parseTranscriptScript(raw: string): AudioTranscriptLine[] {
  // Strip markdown fences if present
  const cleaned = raw
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  try {
    const parsed = JSON.parse(cleaned);
    if (Array.isArray(parsed.lines)) {
      return normalizeLines(parsed.lines);
    }
    if (Array.isArray(parsed)) {
      return normalizeLines(parsed);
    }
  } catch {
    // fall through to line parsing
  }

  const lines: AudioTranscriptLine[] = [];
  const regex = /(?:^|\n)\s*(Host\s*[AB]|Speaker\s*[AB]|A|B)\s*[:\-–]\s*(.+)/gi;
  let match;
  while ((match = regex.exec(cleaned)) !== null) {
    const speakerRaw = match[1].toUpperCase().replace(/\s+/g, " ");
    const speaker: "Host A" | "Host B" =
      speakerRaw.includes("B") || speakerRaw === "B" ? "Host B" : "Host A";
    lines.push({ speaker, text: match[2].trim() });
  }

  return lines;
}

function normalizeLines(
  lines: Array<{ speaker?: string; text?: string }>
): AudioTranscriptLine[] {
  return lines
    .filter((l) => l?.text?.trim())
    .map((l) => {
      const s = String(l.speaker ?? "Host A").toUpperCase();
      return {
        speaker: (s.includes("B") ? "Host B" : "Host A") as "Host A" | "Host B",
        text: String(l.text).trim(),
      };
    });
}
