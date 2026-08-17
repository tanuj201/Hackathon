"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { buildAuthConfirmUrl } from "@/lib/supabase/client";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

/**
 * Handles OAuth tokens when Supabase redirects to Site URL (/) or another
 * page instead of /auth/callback — common when redirect URLs aren't configured.
 */
export function OAuthHashRedirect() {
  const [isSigningIn, setIsSigningIn] = useState(false);

  useEffect(() => {
    const url = new URL(window.location.href);
    const code = url.searchParams.get("code");
    const hash = window.location.hash;

    // PKCE code landed on the wrong path (e.g. home page) — forward to callback
    if (code && url.pathname !== "/auth/callback") {
      setIsSigningIn(true);
      const redirect = url.searchParams.get("redirect") || "/app";
      window.location.replace(
        `/auth/callback?code=${encodeURIComponent(code)}&redirect=${encodeURIComponent(redirect)}`
      );
      return;
    }

    if (!hash.includes("access_token")) return;
    if (url.pathname === "/auth/confirm") return;

    const complete = async () => {
      setIsSigningIn(true);
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
        console.error("OAuth setSession failed:", error.message);
        window.location.href = "/login?error=auth";
        return;
      }

      window.history.replaceState(null, "", window.location.pathname);
      window.location.href = "/app";
    };

    complete();
  }, []);

  if (!isSigningIn) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background/80 backdrop-blur-sm">
      <div className="flex flex-col items-center gap-3 rounded-lg border bg-background p-6 shadow-lg">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Signing you in...</p>
      </div>
    </div>
  );
}
