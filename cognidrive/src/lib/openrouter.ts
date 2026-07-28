import type { AIModel } from "@/types";
import { getSiteUrl } from "@/lib/supabase/client";

const OPENROUTER_BASE = "https://openrouter.ai/api/v1";

interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

interface OpenRouterOptions {
  model: AIModel | string;
  messages: ChatMessage[];
  temperature?: number;
  maxTokens?: number;
  jsonMode?: boolean;
}

function getOpenRouterKey(): string {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key || key.includes("your-openrouter") || key.includes("your_")) {
    throw new Error(
      "OPENROUTER_API_KEY is not configured. Set it in .env.local and restart the dev server."
    );
  }
  return key;
}

export async function callOpenRouter({
  model,
  messages,
  temperature = 0.7,
  maxTokens = 4096,
  jsonMode = false,
}: OpenRouterOptions): Promise<string> {
  const apiKey = getOpenRouterKey();

  const response = await fetch(`${OPENROUTER_BASE}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": getSiteUrl(),
      "X-Title": process.env.NEXT_PUBLIC_SITE_NAME || "CogniDrive",
    },
    body: JSON.stringify({
      model,
      messages,
      temperature,
      max_tokens: maxTokens,
      ...(jsonMode && { response_format: { type: "json_object" } }),
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    if (response.status === 401) {
      throw new Error(
        "Invalid OpenRouter API key. Check that OPENROUTER_API_KEY in .env.local is correct, then restart the dev server."
      );
    }
    throw new Error(`OpenRouter error (${response.status}): ${error.slice(0, 300)}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error("OpenRouter returned an empty response. Check your model selection and API credits.");
  }
  return content;
}

export async function generateEmbedding(text: string): Promise<number[]> {
  const apiKey = getOpenRouterKey();

  const response = await fetch(`${OPENROUTER_BASE}/embeddings`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": getSiteUrl(),
    },
    body: JSON.stringify({
      model: "openai/text-embedding-3-small",
      input: text.slice(0, 8000),
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Embedding error (${response.status}): ${error.slice(0, 200)}`);
  }

  const data = await response.json();
  const embedding = data.data?.[0]?.embedding;
  if (!embedding?.length) {
    throw new Error("Embedding API returned empty vector");
  }
  return embedding;
}
