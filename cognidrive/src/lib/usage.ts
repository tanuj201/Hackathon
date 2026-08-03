import { createServiceClient } from "@/lib/supabase/server";
import { normalizePlan, type PlanId } from "@/lib/plans";
import {
  getEffectivePlanLimits,
  getPlanLabel,
  isEarlyAccessActive,
} from "@/lib/launch-config";

export function getCurrentMonthKey(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

export interface UserUsage {
  plan: PlanId;
  planLabel: string;
  isEarlyAccess: boolean;
  chatCount: number;
  studioCount: number;
  chatLimit: number;
  studioLimit: number;
  storageLimit: number;
}

export async function getUserProfile(userId: string) {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("plan, stripe_customer_id, subscription_status, email")
    .eq("id", userId)
    .single();

  if (error || !data) {
    await supabase.from("profiles").upsert({ id: userId, plan: "free" }, { onConflict: "id" });
    return {
      plan: "free" as PlanId,
      stripe_customer_id: null,
      subscription_status: "inactive",
      email: null,
    };
  }

  const isActive =
    data.subscription_status === "active" || data.subscription_status === "trialing";
  const plan: PlanId = isActive ? normalizePlan(data.plan) : "free";

  return {
    plan,
    stripe_customer_id: data.stripe_customer_id,
    subscription_status: data.subscription_status,
    email: data.email,
  };
}

export async function getUserUsage(userId: string): Promise<UserUsage> {
  const profile = await getUserProfile(userId);
  const earlyAccess = isEarlyAccessActive();
  const limits = getEffectivePlanLimits(profile.plan);
  const monthKey = getCurrentMonthKey();
  const supabase = createServiceClient();

  const { data } = await supabase
    .from("usage_monthly")
    .select("chat_count, studio_count")
    .eq("user_id", userId)
    .eq("month_key", monthKey)
    .single();

  return {
    plan: profile.plan,
    planLabel: getPlanLabel(profile.plan, earlyAccess),
    isEarlyAccess: earlyAccess,
    chatCount: data?.chat_count ?? 0,
    studioCount: data?.studio_count ?? 0,
    chatLimit: limits.chatPerMonth,
    studioLimit: limits.studioPerMonth,
    storageLimit: limits.storageBytes,
  };
}

export async function incrementUsage(
  userId: string,
  field: "chat_count" | "studio_count"
): Promise<void> {
  const monthKey = getCurrentMonthKey();
  const supabase = createServiceClient();

  const { data: existing } = await supabase
    .from("usage_monthly")
    .select("chat_count, studio_count")
    .eq("user_id", userId)
    .eq("month_key", monthKey)
    .single();

  if (existing) {
    const updates =
      field === "chat_count"
        ? { chat_count: existing.chat_count + 1 }
        : { studio_count: existing.studio_count + 1 };
    await supabase.from("usage_monthly").update(updates).eq("user_id", userId).eq("month_key", monthKey);
  } else {
    await supabase.from("usage_monthly").insert({
      user_id: userId,
      month_key: monthKey,
      chat_count: field === "chat_count" ? 1 : 0,
      studio_count: field === "studio_count" ? 1 : 0,
    });
  }
}

export async function checkChatAllowed(userId: string): Promise<{ allowed: boolean; error?: string }> {
  const usage = await getUserUsage(userId);
  if (usage.chatCount >= usage.chatLimit) {
    const error = usage.isEarlyAccess
      ? `Monthly chat limit reached (${usage.chatLimit}). Student Pro pricing starts after launch.`
      : `Monthly chat limit reached (${usage.chatLimit}). Upgrade to Student Pro for more.`;
    return { allowed: false, error };
  }
  return { allowed: true };
}

export async function checkStudioAllowed(userId: string): Promise<{ allowed: boolean; error?: string }> {
  const usage = await getUserUsage(userId);
  if (usage.studioCount >= usage.studioLimit) {
    const error = usage.isEarlyAccess
      ? `Monthly Studio Tools limit reached (${usage.studioLimit}). Student Pro pricing starts after launch.`
      : `Monthly Studio Tools limit reached (${usage.studioLimit}). Upgrade to Student Pro for more.`;
    return { allowed: false, error };
  }
  return { allowed: true };
}
