import { NextRequest, NextResponse } from "next/server";
import { createServerClient, STORAGE_BUCKET, getConfigStatus } from "@/lib/supabase/client";
import { getAuthUserId } from "@/lib/supabase/server";
import { parseDocument } from "@/lib/document-parser";
import { embedAndStoreChunks } from "@/lib/rag";
import { getUserUsage } from "@/lib/usage";
import { formatLaunchEndDate } from "@/lib/launch-config";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const userId = await getAuthUserId();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const config = getConfigStatus();
    if (!config.supabase) {
      return NextResponse.json(
        { error: "Supabase is not configured.", files: [], quota: { used: 0, total: 0 } },
        { status: 503 }
      );
    }

    const usage = await getUserUsage(userId);
    const supabase = createServerClient();
    const { data, error } = await supabase
      .from("files")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message, files: [] }, { status: 500 });
    }

    const used = data?.reduce((sum, f) => sum + Number(f.size), 0) ?? 0;

    return NextResponse.json({
      files: data ?? [],
      quota: {
        used,
        total: usage.storageLimit,
        percent: usage.storageLimit > 0 ? Math.min((used / usage.storageLimit) * 100, 100) : 0,
        remaining: Math.max(usage.storageLimit - used, 0),
      },
      usage: {
        chatCount: usage.chatCount,
        chatLimit: usage.chatLimit,
        studioCount: usage.studioCount,
        studioLimit: usage.studioLimit,
        plan: usage.plan,
        planLabel: usage.planLabel,
        isEarlyAccess: usage.isEarlyAccess,
        launchEndsLabel: formatLaunchEndDate(),
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to load files";
    return NextResponse.json({ error: message, files: [] }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = await getAuthUserId();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const config = getConfigStatus();
    if (!config.supabase) {
      return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 });
    }

    const usage = await getUserUsage(userId);

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
      .select("size")
      .eq("user_id", userId);

    if (sizeError) {
      return NextResponse.json({ error: sizeError.message }, { status: 500 });
    }

    const usedBytes =
      existingFiles?.reduce((sum, f) => sum + Number(f.size), 0) ?? 0;

    if (usedBytes + file.size > usage.storageLimit) {
      return NextResponse.json(
        {
          error: `Storage quota exceeded (${usage.plan} plan). Delete files or upgrade to Student Pro.`,
        },
        { status: 413 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const contentText = await parseDocument(buffer, file.type, file.name);
    const storagePath = `${userId}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;

    let storageWarning: string | undefined;
    if (config.supabaseServiceKey) {
      const { error: uploadError } = await supabase.storage
        .from(STORAGE_BUCKET)
        .upload(storagePath, buffer, {
          contentType: file.type || "application/octet-stream",
          upsert: false,
        });

      if (uploadError) {
        storageWarning = `File saved but storage upload failed: ${uploadError.message}`;
      }
    }

    const { data: fileRecord, error: dbError } = await supabase
      .from("files")
      .insert({
        name: file.name,
        type: file.type || "application/octet-stream",
        size: file.size,
        storage_path: storagePath,
        content_text: contentText,
        user_id: userId,
      })
      .select()
      .single();

    if (dbError) {
      return NextResponse.json({ error: dbError.message }, { status: 500 });
    }

    let chunksStored = 0;
    let chunksEmbedded = 0;
    let embeddingWarning: string | undefined;

    try {
      const result = await embedAndStoreChunks(fileRecord.id, contentText);
      chunksStored = result.stored;
      chunksEmbedded = result.embedded;
      if (result.embeddingError) embeddingWarning = result.embeddingError;
    } catch (err) {
      embeddingWarning = err instanceof Error ? err.message : "Chunk indexing failed";
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
