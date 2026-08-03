import { NextResponse } from "next/server";
import { createServerClient, getConfigStatus, STORAGE_BUCKET } from "@/lib/supabase/client";
import { hasTtsConfigured } from "@/lib/tts";

export const dynamic = "force-dynamic";

export async function GET() {
  const status = getConfigStatus();
  const checks: Record<string, boolean | string> = {
    ...status,
    tts: hasTtsConfigured(),
  };

  if (status.supabase) {
    try {
      const supabase = createServerClient();
      const { error } = await supabase.from("files").select("id").limit(1);
      checks.database = !error;
      if (error) checks.databaseError = error.message;
    } catch (err) {
      checks.database = false;
      checks.databaseError = err instanceof Error ? err.message : "Unknown";
    }

    if (status.supabaseServiceKey) {
      try {
        const supabase = createServerClient();
        const { error } = await supabase.storage.from(STORAGE_BUCKET).list("", {
          limit: 1,
        });
        checks.storageBucket = !error;
        if (error) checks.storageError = error.message;
      } catch (err) {
        checks.storageBucket = false;
        checks.storageError = err instanceof Error ? err.message : "Unknown";
      }
    } else {
      checks.storageBucket = false;
      checks.storageError = "Set SUPABASE_SERVICE_ROLE_KEY for file storage";
    }
  }

  checks.ready = Boolean(
    status.supabase && status.openrouter && checks.database
  );

  return NextResponse.json(checks);
}
