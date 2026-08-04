import { NextResponse } from "next/server";
import { createAuthClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const redirect = searchParams.get("redirect") || "/app";

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=auth`);
  }

  const supabase = await createAuthClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (!error) {
    const safeRedirect = redirect.startsWith("/") ? redirect : "/app";
    return NextResponse.redirect(`${origin}${safeRedirect}`);
  }

  return NextResponse.redirect(`${origin}/login?error=auth`);
}
