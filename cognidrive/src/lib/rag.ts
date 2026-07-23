import { createServerClient } from "@/lib/supabase/client";
import { generateEmbedding } from "@/lib/openrouter";
import { chunkText } from "@/lib/document-parser";

export async function embedAndStoreChunks(
  fileId: string,
  text: string
): Promise<number> {
  const supabase = createServerClient();
  const chunks = chunkText(text);
  let stored = 0;

  for (let i = 0; i < chunks.length; i++) {
    const embedding = await generateEmbedding(chunks[i]);

    const { error } = await supabase.from("document_chunks").insert({
      file_id: fileId,
      content: chunks[i],
      chunk_index: i,
      embedding,
    });

    if (!error) stored++;
  }

  return stored;
}

export async function retrieveRelevantChunks(
  fileId: string,
  query: string,
  topK = 5
): Promise<string[]> {
  const supabase = createServerClient();
  const queryEmbedding = await generateEmbedding(query);

  const { data, error } = await supabase.rpc("match_document_chunks", {
    query_embedding: queryEmbedding,
    match_file_id: fileId,
    match_count: topK,
    match_threshold: 0.3,
  });

  if (error) {
    console.error("RAG retrieval error:", error);
    const { data: fallback } = await supabase
      .from("document_chunks")
      .select("content")
      .eq("file_id", fileId)
      .order("chunk_index")
      .limit(topK);

    return fallback?.map((c) => c.content) ?? [];
  }

  return data?.map((c: { content: string }) => c.content) ?? [];
}
