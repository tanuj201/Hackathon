import { CHUNK_WORD_SIZE } from "@/types";

export function chunkText(text: string, wordsPerChunk = CHUNK_WORD_SIZE): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const chunks: string[] = [];

  for (let i = 0; i < words.length; i += wordsPerChunk) {
    chunks.push(words.slice(i, i + wordsPerChunk).join(" "));
  }

  return chunks.length > 0 ? chunks : [text];
}

export async function parseDocument(
  buffer: Buffer,
  mimeType: string,
  filename: string
): Promise<string> {
  if (mimeType === "application/pdf" || filename.endsWith(".pdf")) {
    const pdfParse = (await import("pdf-parse")).default;
    const data = await pdfParse(buffer);
    return data.text;
  }

  if (
    mimeType.startsWith("text/") ||
    filename.endsWith(".txt") ||
    filename.endsWith(".csv") ||
    filename.endsWith(".md")
  ) {
    return buffer.toString("utf-8");
  }

  throw new Error(`Unsupported file type: ${mimeType}`);
}
