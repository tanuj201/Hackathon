import { NextRequest, NextResponse } from "next/server";
import { createServerClient, STORAGE_BUCKET } from "@/lib/supabase/client";
import { getStorageQuotaFromUsed } from "@/lib/storage-config";

export const dynamic = "force-dynamic";

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = createServerClient();

    const { data: file, error: fetchError } = await supabase
      .from("files")
      .select("id, name, size, storage_path")
      .eq("id", id)
      .single();

    if (fetchError || !file) {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }

    const freedBytes = Number(file.size) || 0;

    // Remove binary from Supabase Storage (best-effort)
    const { error: storageError } = await supabase.storage
      .from(STORAGE_BUCKET)
      .remove([file.storage_path]);

    if (storageError) {
      console.warn("Storage delete warning:", storageError.message);
    }

    // Remove RAG chunks (cascade should handle this, but explicit is safer)
    const { error: chunksError } = await supabase
      .from("document_chunks")
      .delete()
      .eq("file_id", id);

    if (chunksError) {
      return NextResponse.json(
        { error: `Failed to remove document chunks: ${chunksError.message}` },
        { status: 500 }
      );
    }

    const { error: deleteError } = await supabase.from("files").delete().eq("id", id);

    if (deleteError) {
      return NextResponse.json({ error: deleteError.message }, { status: 500 });
    }

    const { data: remaining } = await supabase.from("files").select("size");
    const used =
      remaining?.reduce((sum, f) => sum + Number(f.size), 0) ?? 0;

    return NextResponse.json({
      success: true,
      deleted: { id: file.id, name: file.name },
      freedBytes,
      quota: getStorageQuotaFromUsed(used),
      storageRemoved: !storageError,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Delete failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = createServerClient();

  const { data: file, error } = await supabase
    .from("files")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !file) {
    return NextResponse.json({ error: "File not found" }, { status: 404 });
  }

  return NextResponse.json({ file });
}
