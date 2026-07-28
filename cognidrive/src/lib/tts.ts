import type { AudioTranscriptLine } from "@/types";

export async function generateTTSAudio(
  lines: AudioTranscriptLine[]
): Promise<ArrayBuffer> {
  const elevenLabsKey = process.env.ELEVENLABS_API_KEY;
  const openaiKey = process.env.OPENAI_API_KEY;

  if (elevenLabsKey) {
    return generateElevenLabsAudio(lines, elevenLabsKey);
  }

  if (openaiKey) {
    return generateOpenAIAudio(lines, openaiKey);
  }

  throw new Error(
    "No TTS provider configured. Set ELEVENLABS_API_KEY or OPENAI_API_KEY."
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
          text: line.text,
          model_id: "eleven_monolingual_v1",
          voice_settings: { stability: 0.5, similarity_boost: 0.75 },
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`ElevenLabs TTS error: ${response.status}`);
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
        input: line.text,
        voice,
        response_format: "mp3",
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI TTS error: ${response.status}`);
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
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed.lines)) return parsed.lines;
    if (Array.isArray(parsed)) return parsed;
  } catch {
    // fall through to line parsing
  }

  const lines: AudioTranscriptLine[] = [];
  const regex = /^(Host [AB]):\s*(.+)$/gm;
  let match;
  while ((match = regex.exec(raw)) !== null) {
    lines.push({
      speaker: match[1] as "Host A" | "Host B",
      text: match[2].trim(),
    });
  }

  return lines;
}
