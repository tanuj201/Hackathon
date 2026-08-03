import { NextResponse } from "next/server";
import { getAuthUserId } from "@/lib/supabase/server";
import { getUserProfile, getUserUsage } from "@/lib/usage";
import { PLANS } from "@/lib/plans";
import {
  formatLaunchEndDate,
  getLaunchEndsAtIso,
  isEarlyAccessActive,
  isFreemiumEnabled,
} from "@/lib/launch-config";

export const dynamic = "force-dynamic";

export async function GET() {
  const userId = await getAuthUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const profile = await getUserProfile(userId);
  const usage = await getUserUsage(userId);

  return NextResponse.json({
    profile: {
      email: profile.email,
      plan: usage.plan,
      planName: usage.planLabel,
      subscriptionStatus: profile.subscription_status,
    },
    usage: {
      chatCount: usage.chatCount,
      chatLimit: usage.chatLimit,
      studioCount: usage.studioCount,
      studioLimit: usage.studioLimit,
      storageLimit: usage.storageLimit,
      isEarlyAccess: usage.isEarlyAccess,
      planLabel: usage.planLabel,
    },
    launch: {
      earlyAccess: isEarlyAccessActive(),
      freemiumEnabled: isFreemiumEnabled(),
      launchEndsAt: getLaunchEndsAtIso(),
      launchEndsLabel: formatLaunchEndDate(),
    },
    pricing: {
      proMonthly: PLANS.pro.priceMonthly,
      proYearly: PLANS.pro.priceYearly,
    },
  });
}
