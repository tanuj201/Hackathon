import { CHUNK_WORD_SIZE } from "@/types";

export function chunkText(text: string, wordsPerChunk = CHUNK_WORD_SIZE): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const chunks: string[] = [];

  for (let i = 0; i < words.length; i += wordsPerChunk) {
    chunks.push(words.slice(i, i + wordsPerChunk).join(" "));
  }

  return chunks.length > 0 ? chunks : [text];
}

async function parsePdf(buffer: Buffer): Promise<string> {
  // unpdf works reliably on Vercel serverless (pdf-parse often crashes there)
  const { extractText, getDocumentProxy } = await import("unpdf");
  const pdf = await getDocumentProxy(new Uint8Array(buffer));
  const { text } = await extractText(pdf, { mergePages: true });
  return text || "";
}

export async function parseDocument(
  buffer: Buffer,
  mimeType: string,
  filename: string
): Promise<string> {
  const lowerName = filename.toLowerCase();

  if (mimeType === "application/pdf" || lowerName.endsWith(".pdf")) {
    const text = await parsePdf(buffer);
    if (!text.trim()) {
      throw new Error("Could not extract text from PDF. Try a text-based PDF or upload as TXT.");
    }
    return text;
  }

  if (
    mimeType.startsWith("text/") ||
    lowerName.endsWith(".txt") ||
    lowerName.endsWith(".csv") ||
    lowerName.endsWith(".md")
  ) {
    return buffer.toString("utf-8");
  }

  throw new Error(`Unsupported file type: ${mimeType || "unknown"}. Use PDF, TXT, or CSV.`);
}
