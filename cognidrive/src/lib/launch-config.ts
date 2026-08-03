import { getPlanLimits, PLANS, type PlanId, type PlanLimits } from "@/lib/plans";

export function isFreemiumEnabled(): boolean {
  return process.env.FREEMIUM_ENABLED === "true";
}

export function getLaunchFreeUntil(): Date | null {
  const raw = process.env.LAUNCH_FREE_UNTIL?.trim();
  if (!raw) return null;
  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function isEarlyAccessActive(): boolean {
  if (isFreemiumEnabled()) return false;
  const until = getLaunchFreeUntil();
  if (!until) return true;
  return new Date() < until;
}

export function getEffectivePlanLimits(plan: PlanId): PlanLimits {
  if (isEarlyAccessActive()) return PLANS.pro;
  return getPlanLimits(plan);
}

export function getLaunchEndsAtIso(): string | null {
  const until = getLaunchFreeUntil();
  return until ? until.toISOString() : null;
}

export function formatLaunchEndDate(): string | null {
  const until = getLaunchFreeUntil();
  if (!until) return null;
  return until.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

export function getPlanLabel(plan: PlanId, earlyAccess: boolean): string {
  if (earlyAccess) return "Launch access";
  if (plan === "pro") return "Student Pro";
  if (plan === "pro_plus") return "Student Pro+";
  return "Free";
}
