import type { AIModel } from "@/types";
import { getSiteUrl } from "@/lib/supabase/client";

const OPENROUTER_BASE = "https://openrouter.ai/api/v1";

export const DEEPSEEK_MODEL_FALLBACKS = [
  "deepseek/deepseek-chat-v3-0324",
  "deepseek/deepseek-chat",
  "deepseek/deepseek-r1",
] as const;

export const OPENAI_MODEL_FALLBACKS = [
  "openai/gpt-4o",
  "openai/gpt-4o-mini",
  "openai/chatgpt-4o-latest",
  "openai/gpt-4o-2024-11-20",
] as const;

export const LLAMA_MODEL_FALLBACKS = [
  "meta-llama/llama-3.3-70b-instruct:free",
  "meta-llama/llama-3.3-70b-instruct",
] as const;

/** Reliable models for JSON studio tools (mind map, table, audio script) */
export const STUDIO_MODEL_FALLBACKS = [
  "google/gemini-2.5-flash",
  "deepseek/deepseek-chat-v3-0324",
  "openai/gpt-4o-mini",
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

function isOpenAIModel(model: string): boolean {
  return model.startsWith("openai/");
}

function isDeepSeekModel(model: string): boolean {
  return model.startsWith("deepseek/");
}

function isMetaLlamaModel(model: string): boolean {
  return model.startsWith("meta-llama/");
}

function isGoogleModel(model: string): boolean {
  return model.startsWith("google/");
}

/** Only OpenAI models reliably support response_format json_object on OpenRouter */
function supportsOpenAiJsonFormat(model: string): boolean {
  return isOpenAIModel(model);
}

function prepareMessagesForJson(messages: ChatMessage[]): ChatMessage[] {
  const jsonInstruction =
    "IMPORTANT: Respond with valid JSON only. No markdown code fences, no commentary outside the JSON object.";

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

function uniqueModels(models: string[]): string[] {
  return [...new Set(models)];
}

function sliceFromFallbacks(
  model: string,
  fallbacks: readonly string[]
): string[] {
  if (fallbacks.includes(model as (typeof fallbacks)[number])) {
    const idx = fallbacks.indexOf(model as (typeof fallbacks)[number]);
    return [...fallbacks.slice(idx)];
  }
  return uniqueModels([model, ...fallbacks]);
}

export function getStudioModelsToTry(preferred?: string): string[] {
  const models: string[] = [];
  if (preferred) models.push(preferred);
  for (const m of STUDIO_MODEL_FALLBACKS) {
    if (!models.includes(m)) models.push(m);
  }
  return models;
}

function getModelsToTry(model: string, jsonMode: boolean): string[] {
  if (jsonMode) {
    return getStudioModelsToTry(model);
  }
  if (isDeepSeekModel(model)) {
    return sliceFromFallbacks(model, DEEPSEEK_MODEL_FALLBACKS);
  }
  if (isOpenAIModel(model)) {
    return sliceFromFallbacks(model, OPENAI_MODEL_FALLBACKS);
  }
  if (isMetaLlamaModel(model)) {
    return sliceFromFallbacks(model, LLAMA_MODEL_FALLBACKS);
  }
  return [model];
}

function isRetryableStatus(status?: number): boolean {
  return status === 400 || status === 402 || status === 404 || status === 429 || status === 503;
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
  const payloadMessages = jsonMode && !useJsonFormat
    ? prepareMessagesForJson(messages)
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
    if (response.status === 402) {
      const err = new Error(
        `No OpenRouter credits for ${model}. Add credits at openrouter.ai/credits or use Gemini/DeepSeek.`
      );
      (err as Error & { status?: number }).status = 402;
      throw err;
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
  const modelsToTry = getModelsToTry(model, jsonMode);
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
      if (isRetryableStatus(status)) {
        console.warn(`OpenRouter model ${tryModel} failed (${status}), trying fallback...`);
        continue;
      }
      throw lastError;
    }
  }

  throw lastError ?? new Error("All model fallbacks failed on OpenRouter");
}

/** Parse JSON from model output, tolerating markdown fences and extra text */
export function parseJsonFromModelResponse<T>(raw: string): T {
  const trimmed = raw.trim();
  const fenceMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenceMatch ? fenceMatch[1].trim() : trimmed;

  try {
    return JSON.parse(candidate) as T;
  } catch {
    const start = candidate.indexOf("{");
    const end = candidate.lastIndexOf("}");
    if (start >= 0 && end > start) {
      return JSON.parse(candidate.slice(start, end + 1)) as T;
    }
    throw new Error("Model did not return valid JSON");
  }
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
