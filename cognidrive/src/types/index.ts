export type AIModel =
  | "openai/gpt-4o"
  | "anthropic/claude-3.5-sonnet"
  | "google/gemini-pro-1.5";

export interface AIModelOption {
  id: AIModel;
  label: string;
  provider: string;
}

export const AI_MODELS: AIModelOption[] = [
  { id: "openai/gpt-4o", label: "GPT-4o", provider: "OpenAI" },
  {
    id: "anthropic/claude-3.5-sonnet",
    label: "Claude 3.5 Sonnet",
    provider: "Anthropic",
  },
  {
    id: "google/gemini-pro-1.5",
    label: "Gemini 1.5 Pro",
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
}

export const MAX_STORAGE_BYTES = 100 * 1024 * 1024; // 100 MB demo quota
export const CHUNK_WORD_SIZE = 500;
