import { NextRequest, NextResponse } from "next/server";
import { createServerClient, STORAGE_BUCKET } from "@/lib/supabase/client";
import { parseDocument } from "@/lib/document-parser";
import { embedAndStoreChunks } from "@/lib/rag";
import { MAX_STORAGE_BYTES } from "@/types";

export async function GET() {
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("files")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const used = data?.reduce((sum, f) => sum + Number(f.size), 0) ?? 0;

  return NextResponse.json({
    files: data ?? [],
    quota: { used, total: MAX_STORAGE_BYTES },
  });
}

export async function POST(request: NextRequest) {
  try {
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

    const { data: existingFiles } = await supabase.from("files").select("size");
    const usedBytes =
      existingFiles?.reduce((sum, f) => sum + Number(f.size), 0) ?? 0;

    if (usedBytes + file.size > MAX_STORAGE_BYTES) {
      return NextResponse.json(
        { error: "Storage quota exceeded" },
        { status: 413 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const contentText = await parseDocument(buffer, file.type, file.name);
    const storagePath = `${Date.now()}-${file.name}`;

    const { error: uploadError } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(storagePath, buffer, { contentType: file.type });

    if (uploadError) {
      return NextResponse.json({ error: uploadError.message }, { status: 500 });
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
      return NextResponse.json({ error: dbError.message }, { status: 500 });
    }

    const chunksStored = await embedAndStoreChunks(fileRecord.id, contentText);

    return NextResponse.json({
      file: fileRecord,
      chunksStored,
      message: "File uploaded and indexed successfully",
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Upload failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
