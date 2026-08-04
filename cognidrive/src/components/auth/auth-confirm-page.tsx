"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

function safeRedirectPath(path: string | null): string {
  if (!path || path === "/" || !path.startsWith("/")) return "/app";
  return path;
}

export function AuthConfirmPage() {
  const searchParams = useSearchParams();
  const redirect = safeRedirectPath(searchParams.get("redirect"));

  useEffect(() => {
    const completeAuth = async () => {
      const supabase = getSupabaseBrowserClient();
      const hash = window.location.hash;

      if (hash.includes("access_token")) {
        const params = new URLSearchParams(hash.replace(/^#/, ""));
        const access_token = params.get("access_token");
        const refresh_token = params.get("refresh_token");

        if (access_token && refresh_token) {
          const { error } = await supabase.auth.setSession({
            access_token,
            refresh_token,
          });
          if (!error) {
            window.location.href = redirect;
            return;
          }
        }
      }

      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        window.location.href = redirect;
        return;
      }

      window.location.href = "/login?error=auth";
    };

    completeAuth();
  }, [redirect]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );
}
