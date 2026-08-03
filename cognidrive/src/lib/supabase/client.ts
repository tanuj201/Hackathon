import { createClient, SupabaseClient } from "@supabase/supabase-js";

export const STORAGE_BUCKET = "cognidrive-files";

function getSupabaseUrl(): string {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url || url.includes("your-project")) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL is not configured. Add it in Vercel → Settings → Environment Variables."
    );
  }
  return url;
}

function getSupabaseAnonKey(): string {
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!key || key.includes("your-supabase")) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_ANON_KEY is not configured. Add it in Vercel → Settings → Environment Variables."
    );
  }
  return key;
}

let browserClient: SupabaseClient | null = null;

/** Browser-safe client (uses anon key) — for auth UI */
export function getSupabaseBrowserClient(): SupabaseClient {
  if (!browserClient) {
    browserClient = createClient(getSupabaseUrl(), getSupabaseAnonKey());
  }
  return browserClient;
}

/** Server-side client — prefers service role key to bypass RLS for uploads. */
export function createServerClient(): SupabaseClient {
  const url = getSupabaseUrl();
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (serviceKey && !serviceKey.includes("your-supabase")) {
    return createClient(url, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }

  return createClient(url, getSupabaseAnonKey(), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export type ConfigStatus = {
  supabase: boolean;
  supabaseServiceKey: boolean;
  openrouter: boolean;
  siteUrl: string;
};

export function getConfigStatus(): ConfigStatus {
  return {
    supabase: !!(
      process.env.NEXT_PUBLIC_SUPABASE_URL &&
      !process.env.NEXT_PUBLIC_SUPABASE_URL.includes("your-project") &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY &&
      !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY.includes("your-supabase")
    ),
    supabaseServiceKey: !!(
      process.env.SUPABASE_SERVICE_ROLE_KEY &&
      !process.env.SUPABASE_SERVICE_ROLE_KEY.includes("your-supabase")
    ),
    openrouter: !!(
      process.env.OPENROUTER_API_KEY &&
      !process.env.OPENROUTER_API_KEY.includes("your-openrouter")
    ),
    siteUrl: getSiteUrl(),
  };
}

export function getSiteUrl(): string {
  if (process.env.NEXT_PUBLIC_SITE_URL && !process.env.NEXT_PUBLIC_SITE_URL.includes("localhost")) {
    return process.env.NEXT_PUBLIC_SITE_URL;
  }
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }
  return process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
}

export const supabase = {
  get client() {
    return getSupabaseBrowserClient();
  },
};
