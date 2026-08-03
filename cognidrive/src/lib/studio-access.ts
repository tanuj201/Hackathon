import { createServerClient } from "@/lib/supabase/client";
import { getAuthUserId } from "@/lib/supabase/server";
import { checkStudioAllowed, incrementUsage } from "@/lib/usage";

type StudioFile = { content_text: string; name: string };

export async function getStudioFileAccess(fileId: string): Promise<
  | { ok: true; userId: string; file: StudioFile }
  | { ok: false; status: number; error: string }
> {
  const userId = await getAuthUserId();
  if (!userId) {
    return { ok: false, status: 401, error: "Unauthorized" };
  }

  const studioCheck = await checkStudioAllowed(userId);
  if (!studioCheck.allowed) {
    return { ok: false, status: 429, error: studioCheck.error ?? "Studio limit reached" };
  }

  const supabase = createServerClient();
  const { data: file, error } = await supabase
    .from("files")
    .select("content_text, name")
    .eq("id", fileId)
    .eq("user_id", userId)
    .single();

  if (error || !file?.content_text) {
    return { ok: false, status: 404, error: "Document not found" };
  }

  return { ok: true, userId, file: file as StudioFile };
}

export async function recordStudioUsage(userId: string) {
  await incrementUsage(userId, "studio_count");
}
