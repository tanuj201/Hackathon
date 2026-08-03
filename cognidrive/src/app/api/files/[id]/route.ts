import { NextRequest, NextResponse } from "next/server";
import { createServerClient, STORAGE_BUCKET } from "@/lib/supabase/client";
import { getAuthUserId } from "@/lib/supabase/server";
import { getUserUsage } from "@/lib/usage";

export const dynamic = "force-dynamic";

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getAuthUserId();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const supabase = createServerClient();

    const { data: file, error: fetchError } = await supabase
      .from("files")
      .select("id, name, size, storage_path, user_id")
      .eq("id", id)
      .single();

    if (fetchError || !file) {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }

    if (file.user_id !== userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const freedBytes = Number(file.size) || 0;

    await supabase.storage.from(STORAGE_BUCKET).remove([file.storage_path]);
    await supabase.from("document_chunks").delete().eq("file_id", id);

    const { error: deleteError } = await supabase.from("files").delete().eq("id", id);

    if (deleteError) {
      return NextResponse.json({ error: deleteError.message }, { status: 500 });
    }

    const usage = await getUserUsage(userId);
    const { data: remaining } = await supabase
      .from("files")
      .select("size")
      .eq("user_id", userId);
    const used = remaining?.reduce((sum, f) => sum + Number(f.size), 0) ?? 0;

    return NextResponse.json({
      success: true,
      deleted: { id: file.id, name: file.name },
      freedBytes,
      quota: {
        used,
        total: usage.storageLimit,
        remaining: Math.max(usage.storageLimit - used, 0),
      },
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
  const userId = await getAuthUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const supabase = createServerClient();

  const { data: file, error } = await supabase
    .from("files")
    .select("*")
    .eq("id", id)
    .eq("user_id", userId)
    .single();

  if (error || !file) {
    return NextResponse.json({ error: "File not found" }, { status: 404 });
  }

  return NextResponse.json({ file });
}
