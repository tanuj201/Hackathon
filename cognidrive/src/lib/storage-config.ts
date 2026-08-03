/** Default cloud storage quota — override with MAX_STORAGE_MB in Vercel (e.g. 2048 = 2 GB) */
export const DEFAULT_MAX_STORAGE_MB = 1024;

export function getMaxStorageBytes(): number {
  const raw = process.env.MAX_STORAGE_MB;
  const mb = raw ? Number.parseInt(raw, 10) : DEFAULT_MAX_STORAGE_MB;
  if (!Number.isFinite(mb) || mb <= 0) {
    return DEFAULT_MAX_STORAGE_MB * 1024 * 1024;
  }
  return mb * 1024 * 1024;
}

export function getStorageQuotaFromUsed(usedBytes: number) {
  const total = getMaxStorageBytes();
  return {
    used: usedBytes,
    total,
    percent: total > 0 ? Math.min((usedBytes / total) * 100, 100) : 0,
    remaining: Math.max(total - usedBytes, 0),
  };
}
