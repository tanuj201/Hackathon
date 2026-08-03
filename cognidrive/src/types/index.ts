export type AIModel =
  | "openai/gpt-4o"
  | "deepseek/deepseek-chat-v3-0324"
  | "google/gemini-2.5-flash";

export interface AIModelOption {
  id: AIModel;
  label: string;
  provider: string;
}

export const AI_MODELS: AIModelOption[] = [
  { id: "openai/gpt-4o", label: "GPT-4o", provider: "OpenAI" },
  {
    id: "deepseek/deepseek-chat-v3-0324",
    label: "DeepSeek V3",
    provider: "DeepSeek",
  },
  {
    id: "google/gemini-2.5-flash",
    label: "Gemini 2.5 Flash",
    provider: "Google",
  },
];

export interface StoredFile {
  id: string;
  name: string;
  type: string;
  size: number;
  storage_path: string;
  content_text: string | null;
  created_at: string;
  user_id: string;
}

export interface DocumentChunk {
  id: string;
  file_id: string;
  content: string;
  chunk_index: number;
  embedding?: number[];
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: Date;
}

export interface MindMapNode {
  id: string;
  label: string;
  children?: MindMapNode[];
}

export interface ExtractedTableRow {
  [key: string]: string | number | null;
}

export interface ExtractedTable {
  columns: string[];
  rows: ExtractedTableRow[];
}

export interface AudioTranscriptLine {
  speaker: "Host A" | "Host B";
  text: string;
}

export interface StorageQuota {
  used: number;
  total: number;
  percent?: number;
  remaining?: number;
}

/** Client fallback before API loads — matches 1 GB default server quota */
export const DEFAULT_STORAGE_BYTES = 1024 * 1024 * 1024;
export const CHUNK_WORD_SIZE = 500;
