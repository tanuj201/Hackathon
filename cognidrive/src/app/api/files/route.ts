import { NextRequest, NextResponse } from "next/server";
import { createServerClient, STORAGE_BUCKET, getConfigStatus } from "@/lib/supabase/client";
import { parseDocument } from "@/lib/document-parser";
import { embedAndStoreChunks } from "@/lib/rag";
import { getMaxStorageBytes, getStorageQuotaFromUsed } from "@/lib/storage-config";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const config = getConfigStatus();
    if (!config.supabase) {
      return NextResponse.json(
        {
          error:
            "Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in Vercel → Settings → Environment Variables, then redeploy.",
          files: [],
          quota: { used: 0, total: getMaxStorageBytes() },
        },
        { status: 503 }
      );
    }

    const supabase = createServerClient();
    const { data, error } = await supabase
      .from("files")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      const hint = error.message.includes("relation")
        ? " Run supabase/schema.sql in your Supabase SQL Editor."
        : "";
      return NextResponse.json(
        { error: `${error.message}${hint}`, files: [], quota: { used: 0, total: getMaxStorageBytes() } },
        { status: 500 }
      );
    }

    const used = data?.reduce((sum, f) => sum + Number(f.size), 0) ?? 0;

    return NextResponse.json({
      files: data ?? [],
      quota: getStorageQuotaFromUsed(used),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to load files";
    return NextResponse.json(
      { error: message, files: [], quota: { used: 0, total: getMaxStorageBytes() } },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const config = getConfigStatus();
    if (!config.supabase) {
      return NextResponse.json(
        {
          error:
            "Supabase is not configured. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in Vercel Environment Variables and redeploy.",
        },
        { status: 503 }
      );
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const allowedTypes = [
      "application/pdf",
      "text/plain",
      "text/csv",
      "application/vnd.ms-excel",
      "application/octet-stream",
    ];
    const allowedExtensions = [".pdf", ".txt", ".csv", ".md"];
    const hasValidExt = allowedExtensions.some((ext) =>
      file.name.toLowerCase().endsWith(ext)
    );

    if (!allowedTypes.includes(file.type) && !hasValidExt) {
      return NextResponse.json(
        { error: "Only PDF, TXT, and CSV files are supported" },
        { status: 400 }
      );
    }

    const supabase = createServerClient();

    const { data: existingFiles, error: sizeError } = await supabase
      .from("files")
      .select("size");

    if (sizeError) {
      const hint = sizeError.message.includes("relation")
        ? " Create tables by running supabase/schema.sql in Supabase SQL Editor."
        : "";
      return NextResponse.json(
        { error: `Database error: ${sizeError.message}${hint}` },
        { status: 500 }
      );
    }

    const usedBytes =
      existingFiles?.reduce((sum, f) => sum + Number(f.size), 0) ?? 0;

    const maxBytes = getMaxStorageBytes();
    if (usedBytes + file.size > maxBytes) {
      return NextResponse.json(
        { error: "Storage quota exceeded" },
        { status: 413 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const contentText = await parseDocument(buffer, file.type, file.name);
    const storagePath = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;

    let storageWarning: string | undefined;
    if (config.supabaseServiceKey) {
      const { error: uploadError } = await supabase.storage
        .from(STORAGE_BUCKET)
        .upload(storagePath, buffer, {
          contentType: file.type || "application/octet-stream",
          upsert: false,
        });

      if (uploadError) {
        storageWarning = `File saved but storage upload failed: ${uploadError.message}. Create bucket "${STORAGE_BUCKET}" in Supabase → Storage.`;
        console.warn(storageWarning);
      }
    } else {
      storageWarning =
        "SUPABASE_SERVICE_ROLE_KEY not set — file text saved to database only (no binary in Storage). Add the service role key in Vercel for full storage.";
    }

    const { data: fileRecord, error: dbError } = await supabase
      .from("files")
      .insert({
        name: file.name,
        type: file.type || "application/octet-stream",
        size: file.size,
        storage_path: storagePath,
        content_text: contentText,
        user_id: "default-user",
      })
      .select()
      .single();

    if (dbError) {
      return NextResponse.json(
        {
          error: `Failed to save file: ${dbError.message}. Ensure supabase/schema.sql was run and RLS policies exist.`,
        },
        { status: 500 }
      );
    }

    let chunksStored = 0;
    let chunksEmbedded = 0;
    let embeddingWarning: string | undefined;

    try {
      const result = await embedAndStoreChunks(fileRecord.id, contentText);
      chunksStored = result.stored;
      chunksEmbedded = result.embedded;
      if (result.embeddingError) {
        embeddingWarning = result.embeddingError;
      }
    } catch (err) {
      embeddingWarning =
        err instanceof Error ? err.message : "Chunk indexing failed";
      console.warn("Embedding error:", embeddingWarning);
    }

    return NextResponse.json({
      file: fileRecord,
      chunksStored,
      chunksEmbedded,
      storageWarning,
      embeddingWarning,
      message: "File uploaded successfully",
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Upload failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
