import { createServerClient } from "@/lib/supabase/client";
import { generateEmbedding } from "@/lib/openrouter";
import { chunkText } from "@/lib/document-parser";

const MAX_CHUNKS_TO_EMBED = 8;

/** Store text chunks first; embeddings are best-effort (won't block upload). */
export async function embedAndStoreChunks(
  fileId: string,
  text: string
): Promise<{ stored: number; embedded: number; embeddingError?: string }> {
  const supabase = createServerClient();
  const chunks = chunkText(text);
  let stored = 0;
  let embedded = 0;
  let embeddingError: string | undefined;

  for (let i = 0; i < chunks.length; i++) {
    let embedding: number[] | null = null;

    if (i < MAX_CHUNKS_TO_EMBED) {
      try {
        embedding = await generateEmbedding(chunks[i]);
        embedded++;
      } catch (err) {
        embeddingError =
          err instanceof Error ? err.message : "Embedding failed";
        // Continue storing chunks without vectors
      }
    }

    const { error } = await supabase.from("document_chunks").insert({
      file_id: fileId,
      content: chunks[i],
      chunk_index: i,
      ...(embedding ? { embedding } : {}),
    });

    if (!error) stored++;
  }

  return { stored, embedded, embeddingError };
}

export async function retrieveRelevantChunks(
  fileId: string,
  query: string,
  topK = 5
): Promise<string[]> {
  const supabase = createServerClient();

  // Try vector search when embeddings are available
  try {
    const queryEmbedding = await generateEmbedding(query);

    const { data, error } = await supabase.rpc("match_document_chunks", {
      query_embedding: queryEmbedding,
      match_file_id: fileId,
      match_count: topK,
      match_threshold: 0.2,
    });

    if (!error && data?.length) {
      return data.map((c: { content: string }) => c.content);
    }
  } catch {
    // Fall through to text-chunk retrieval
  }

  // Fallback: return stored text chunks (no embedding required)
  const { data: fallback } = await supabase
    .from("document_chunks")
    .select("content")
    .eq("file_id", fileId)
    .order("chunk_index")
    .limit(topK);

  if (fallback?.length) {
    return fallback.map((c) => c.content);
  }

  return [];
}
