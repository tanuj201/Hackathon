import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createServiceClient } from "@/lib/supabase/server";
import { getStripe } from "@/lib/stripe";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const stripe = getStripe();
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!stripe || !webhookSecret) {
    return NextResponse.json({ error: "Webhook not configured" }, { status: 503 });
  }

  const body = await request.text();
  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ error: "No signature" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Invalid signature";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  const supabase = createServiceClient();

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      const userId = session.metadata?.supabase_user_id;
      if (userId && session.subscription) {
        await supabase
          .from("profiles")
          .update({
            plan: "pro",
            stripe_subscription_id: String(session.subscription),
            subscription_status: "active",
            updated_at: new Date().toISOString(),
          })
          .eq("id", userId);
      }
      break;
    }
    case "customer.subscription.updated": {
      const sub = event.data.object as Stripe.Subscription;
      let userId = sub.metadata?.supabase_user_id;
      if (!userId && sub.customer) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("id")
          .eq("stripe_customer_id", String(sub.customer))
          .single();
        userId = profile?.id;
      }
      if (userId) {
        const status = sub.status;
        const isActive = status === "active" || status === "trialing";
        await supabase
          .from("profiles")
          .update({
            plan: isActive ? "pro" : "free",
            subscription_status: status,
            stripe_subscription_id: sub.id,
            updated_at: new Date().toISOString(),
          })
          .eq("id", userId);
      }
      break;
    }
    case "customer.subscription.deleted": {
      const sub = event.data.object as Stripe.Subscription;
      let userId = sub.metadata?.supabase_user_id;
      if (!userId && sub.customer) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("id")
          .eq("stripe_customer_id", String(sub.customer))
          .single();
        userId = profile?.id;
      }
      if (userId) {
        await supabase
          .from("profiles")
          .update({
            plan: "free",
            subscription_status: "cancelled",
            updated_at: new Date().toISOString(),
          })
          .eq("id", userId);
      }
      break;
    }
  }

  return NextResponse.json({ received: true });
}
