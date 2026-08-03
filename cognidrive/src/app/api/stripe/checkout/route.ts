import { NextRequest, NextResponse } from "next/server";
import { createAuthClient, getAuthUserId } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/server";
import { isEarlyAccessActive } from "@/lib/launch-config";
import {
  getCheckoutUrls,
  getEduCouponId,
  getStripe,
  getStripePriceMonthly,
  getStripePriceYearly,
  isStripeConfigured,
} from "@/lib/stripe";
import { getUserProfile } from "@/lib/usage";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
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
  if (!stripe || !isStripeConfigured()) {
    return NextResponse.json(
      { error: "Stripe is not configured. Add STRIPE_SECRET_KEY and price IDs in Vercel." },
      { status: 503 }
    );
  }

  const body = await request.json().catch(() => ({}));
  const interval = body.interval === "year" ? "year" : "month";
  const priceId = interval === "year" ? getStripePriceYearly() : getStripePriceMonthly();

  if (!priceId) {
    return NextResponse.json({ error: "Stripe price not configured" }, { status: 503 });
  }

  const authClient = await createAuthClient();
  const { data: { user } } = await authClient.auth.getUser();
  const profile = await getUserProfile(userId);
  const supabase = createServiceClient();

  let customerId = profile.stripe_customer_id;
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: user?.email,
      metadata: { supabase_user_id: userId },
    });
    customerId = customer.id;
    await supabase
      .from("profiles")
      .update({ stripe_customer_id: customerId })
      .eq("id", userId);
  }

  const { success, cancel } = getCheckoutUrls();
  const email = user?.email ?? "";
  const isEdu = email.toLowerCase().endsWith(".edu");
  const eduCoupon = getEduCouponId();

  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: "subscription",
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: success,
    cancel_url: cancel,
    ...(isEdu && eduCoupon ? { discounts: [{ coupon: eduCoupon }] } : {}),
    subscription_data: {
      metadata: { supabase_user_id: userId, plan: "pro" },
    },
    metadata: { supabase_user_id: userId },
  });

  return NextResponse.json({ url: session.url });
}
