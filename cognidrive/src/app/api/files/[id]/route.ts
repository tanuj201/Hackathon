import { NextRequest, NextResponse } from "next/server";
import { createServerClient, STORAGE_BUCKET } from "@/lib/supabase/client";

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = createServerClient();

  const { data: file, error: fetchError } = await supabase
    .from("files")
    .select("storage_path")
    .eq("id", id)
    .single();

  if (fetchError || !file) {
    return NextResponse.json({ error: "File not found" }, { status: 404 });
  }

  await supabase.storage.from(STORAGE_BUCKET).remove([file.storage_path]);
  await supabase.from("document_chunks").delete().eq("file_id", id);

  const { error } = await supabase.from("files").delete().eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
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
