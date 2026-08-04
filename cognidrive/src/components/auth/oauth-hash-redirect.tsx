"use client";

import { useEffect } from "react";
import { buildAuthCallbackUrl } from "@/lib/supabase/client";

/**
 * When Supabase falls back to Site URL (root) with #access_token in the hash,
 * forward to /auth/callback so we can set the session and redirect to /app.
 */
export function OAuthHashRedirect() {
  useEffect(() => {
    const hash = window.location.hash;
    if (!hash.includes("access_token")) return;
    if (window.location.pathname === "/auth/callback") return;

    const redirect = "/app";
    window.location.replace(`${buildAuthCallbackUrl(redirect)}${hash}`);
  }, []);

  return null;
}
