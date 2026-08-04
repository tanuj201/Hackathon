"use client";

import { useEffect } from "react";
import { buildAuthConfirmUrl } from "@/lib/supabase/client";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

/**
 * When Supabase falls back to Site URL (root) with #access_token in the hash,
 * complete sign-in here and hard-navigate to /app so middleware sees cookies.
 */
export function OAuthHashRedirect() {
  useEffect(() => {
    const hash = window.location.hash;
    if (!hash.includes("access_token")) return;
    if (window.location.pathname === "/auth/confirm") return;

    const complete = async () => {
      const params = new URLSearchParams(hash.replace(/^#/, ""));
      const access_token = params.get("access_token");
      const refresh_token = params.get("refresh_token");

      if (!access_token || !refresh_token) {
        window.location.replace(`${buildAuthConfirmUrl("/app")}${hash}`);
        return;
      }

      const supabase = getSupabaseBrowserClient();
      const { error } = await supabase.auth.setSession({
        access_token,
        refresh_token,
      });

      if (error) {
        window.location.href = "/login?error=auth";
        return;
      }

      window.history.replaceState(null, "", window.location.pathname);
      window.location.href = "/app";
    };

    complete();
  }, []);

  return null;
}
