import { NextResponse } from "next/server";
import { getAuthUserId } from "@/lib/supabase/server";
import { getSiteUrl } from "@/lib/supabase/client";
import { isEarlyAccessActive } from "@/lib/launch-config";
import { getStripe } from "@/lib/stripe";
import { getUserProfile } from "@/lib/usage";

export const dynamic = "force-dynamic";

export async function POST() {
  const userId = await getAuthUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (isEarlyAccessActive()) {
    return NextResponse.json(
      {
        error:
          "Billing opens after the launch period. All Pro features are free until then.",
      },
      { status: 503 }
    );
  }

  const stripe = getStripe();
  if (!stripe) {
    return NextResponse.json({ error: "Stripe not configured" }, { status: 503 });
  }

  const profile = await getUserProfile(userId);
  if (!profile.stripe_customer_id) {
    return NextResponse.json({ error: "No billing account found" }, { status: 400 });
  }

  const session = await stripe.billingPortal.sessions.create({
    customer: profile.stripe_customer_id,
    return_url: `${getSiteUrl()}/app`,
  });

  return NextResponse.json({ url: session.url });
}
