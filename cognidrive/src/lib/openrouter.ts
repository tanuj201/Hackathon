import type { AIModel } from "@/types";
import { getSiteUrl } from "@/lib/supabase/client";

const OPENROUTER_BASE = "https://openrouter.ai/api/v1";

/** If the selected DeepSeek slug fails, try these in order */
export const DEEPSEEK_MODEL_FALLBACKS = [
  "deepseek/deepseek-chat-v3-0324",
  "deepseek/deepseek-chat",
  "deepseek/deepseek-r1",
] as const;

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
      "OPENROUTER_API_KEY is not configured. Add it in Vercel → Settings → Environment Variables and redeploy."
    );
  }
  return key;
}

function isAnthropicModel(model: string): boolean {
  return model.startsWith("anthropic/");
}

/** Anthropic on OpenRouter often rejects OpenAI-style response_format — use prompt JSON instead */
function prepareMessagesForJson(
  messages: ChatMessage[],
  model: string
): ChatMessage[] {
  if (!isAnthropicModel(model)) return messages;

  const jsonInstruction =
    "IMPORTANT: Respond with valid JSON only. No markdown fences, no commentary outside the JSON object.";

  const systemIdx = messages.findIndex((m) => m.role === "system");
  if (systemIdx >= 0) {
    const copy = [...messages];
    copy[systemIdx] = {
      ...copy[systemIdx],
      content: `${copy[systemIdx].content}\n\n${jsonInstruction}`,
    };
    return copy;
  }

  return [{ role: "system", content: jsonInstruction }, ...messages];
}

function supportsOpenAiJsonFormat(model: string): boolean {
  // Anthropic models via OpenRouter typically fail with response_format
  return !isAnthropicModel(model);
}

function isDeepSeekModel(model: string): boolean {
  return model.startsWith("deepseek/");
}

function getModelsToTry(model: string): string[] {
  if (!isDeepSeekModel(model)) return [model];

  const fallbacks = [...DEEPSEEK_MODEL_FALLBACKS];
  if (fallbacks.includes(model as typeof DEEPSEEK_MODEL_FALLBACKS[number])) {
    const idx = fallbacks.indexOf(model as typeof DEEPSEEK_MODEL_FALLBACKS[number]);
    return fallbacks.slice(idx);
  }
  return [model, ...fallbacks];
}

async function callOpenRouterOnce(
  model: string,
  messages: ChatMessage[],
  temperature: number,
  maxTokens: number,
  jsonMode: boolean,
  apiKey: string
): Promise<string> {
  const useJsonFormat = jsonMode && supportsOpenAiJsonFormat(model);
  const payloadMessages = jsonMode && isAnthropicModel(model)
    ? prepareMessagesForJson(messages, model)
    : messages;

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
      messages: payloadMessages,
      temperature,
      max_tokens: maxTokens,
      ...(useJsonFormat && { response_format: { type: "json_object" } }),
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    if (response.status === 401) {
      throw new Error(
        "Invalid OpenRouter API key. Check OPENROUTER_API_KEY in Vercel Environment Variables and redeploy."
      );
    }
    const err = new Error(
      `OpenRouter error (${response.status}) [${model}]: ${error.slice(0, 300)}`
    );
    (err as Error & { status?: number }).status = response.status;
    throw err;
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error(
      `OpenRouter returned an empty response for ${model}. Check API credits on openrouter.ai`
    );
  }
  return content;
}

export async function callOpenRouter({
  model,
  messages,
  temperature = 0.7,
  maxTokens = 4096,
  jsonMode = false,
}: OpenRouterOptions): Promise<string> {
  const apiKey = getOpenRouterKey();
  const modelsToTry = getModelsToTry(model);
  let lastError: Error | null = null;

  for (const tryModel of modelsToTry) {
    try {
      return await callOpenRouterOnce(
        tryModel,
        messages,
        temperature,
        maxTokens,
        jsonMode,
        apiKey
      );
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      const status = (err as Error & { status?: number }).status;
      // Retry on model-not-found / provider errors
      if (status === 404 || status === 400 || status === 503) {
        console.warn(`OpenRouter model ${tryModel} failed, trying fallback...`);
        continue;
      }
      throw lastError;
    }
  }

  throw lastError ?? new Error("All model fallbacks failed on OpenRouter");
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
