"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, CheckCircle2, ExternalLink } from "lucide-react";

interface StatusResponse {
  supabase: boolean;
  supabaseServiceKey: boolean;
  openrouter: boolean;
  database?: boolean;
  databaseError?: string;
  storageBucket?: boolean;
  storageError?: string;
  ready?: boolean;
  siteUrl?: string;
}

export function SetupBanner() {
  const [status, setStatus] = useState<StatusResponse | null>(null);

  useEffect(() => {
    fetch("/api/status")
      .then((res) => res.json())
      .then(setStatus)
      .catch(() => {});
  }, []);

  if (!status || status.ready) return null;

  const issues: string[] = [];

  if (!status.supabase) {
    issues.push(
      "Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in Vercel → Settings → Environment Variables"
    );
  }
  if (status.supabase && status.database === false) {
    issues.push(
      `Database not ready: ${status.databaseError ?? "unknown"}. Run supabase/schema.sql in Supabase SQL Editor.`
    );
  }
  if (!status.supabaseServiceKey) {
    issues.push(
      "Set SUPABASE_SERVICE_ROLE_KEY (Supabase → Settings → API → service_role) for file uploads"
    );
  }
  if (status.supabaseServiceKey && status.storageBucket === false) {
    issues.push(
      `Storage bucket missing: ${status.storageError ?? "unknown"}. Create bucket "cognidrive-files" in Supabase → Storage.`
    );
  }
  if (!status.openrouter) {
    issues.push(
      "Set OPENROUTER_API_KEY in Vercel Environment Variables (get one at openrouter.ai/keys)"
    );
  }

  if (issues.length === 0) return null;

  return (
    <div className="border-b border-yellow-500/30 bg-yellow-500/10 px-4 py-3 shrink-0">
      <div className="flex items-start gap-2 max-w-4xl mx-auto">
        <AlertTriangle className="h-5 w-5 mt-0.5 shrink-0 text-yellow-600" />
        <div className="space-y-2 text-sm">
          <p className="font-semibold text-yellow-800">Setup required — fix these to enable uploads & AI chat</p>
          <ul className="space-y-1 text-yellow-700/90">
            {issues.map((issue, i) => (
              <li key={i} className="flex items-start gap-2">
                <span className="text-yellow-600 mt-0.5">•</span>
                <span>{issue}</span>
              </li>
            ))}
          </ul>
          <p className="text-xs text-yellow-600/80 flex items-center gap-1">
            After adding variables in Vercel, click{" "}
            <strong>Deployments → Redeploy</strong> (required for env changes).
            <a
              href="https://vercel.com/docs/projects/environment-variables"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-0.5 underline ml-1"
            >
              Docs <ExternalLink className="h-3 w-3" />
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}

export function SetupStatusCompact() {
  const [status, setStatus] = useState<StatusResponse | null>(null);

  useEffect(() => {
    fetch("/api/status")
      .then((res) => res.json())
      .then(setStatus)
      .catch(() => {});
  }, []);

  if (!status) return null;

  return (
    <div className="px-4 py-2 border-b flex flex-wrap gap-3 text-xs">
      <StatusDot ok={status.supabase} label="Supabase" />
      <StatusDot ok={status.database} label="Database" />
      <StatusDot ok={status.openrouter} label="OpenRouter" />
      <StatusDot ok={status.storageBucket} label="Storage" />
    </div>
  );
}

function StatusDot({ ok, label }: { ok?: boolean; label: string }) {
  return (
    <span className="flex items-center gap-1 text-muted-foreground">
      {ok ? (
        <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
      ) : (
        <AlertTriangle className="h-3.5 w-3.5 text-yellow-500" />
      )}
      {label}
    </span>
  );
}
