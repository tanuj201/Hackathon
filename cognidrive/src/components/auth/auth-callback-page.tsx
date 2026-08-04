"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

export function AuthCallbackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get("redirect") || "/app";

  useEffect(() => {
    const completeAuth = async () => {
      const supabase = getSupabaseBrowserClient();
      const code = searchParams.get("code");
      const hash = window.location.hash;

      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (!error) {
          router.replace(redirect);
          router.refresh();
          return;
        }
      }

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
            window.history.replaceState(
              null,
              "",
              window.location.pathname + window.location.search
            );
            router.replace(redirect);
            router.refresh();
            return;
          }
        }
      }

      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        router.replace(redirect);
        router.refresh();
        return;
      }

      router.replace("/login?error=auth");
    };

    completeAuth();
  }, [redirect, router, searchParams]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );
}
