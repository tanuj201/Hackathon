import Stripe from "stripe";
import { getSiteUrl } from "@/lib/supabase/client";

export function getStripe(): Stripe | null {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key || key.includes("your-stripe")) return null;
  return new Stripe(key, { apiVersion: "2025-02-24.acacia" });
}

export function getStripePriceMonthly(): string | undefined {
  return process.env.STRIPE_PRICE_PRO_MONTHLY;
}

export function getStripePriceYearly(): string | undefined {
  return process.env.STRIPE_PRICE_PRO_YEARLY;
}

export function getEduCouponId(): string | undefined {
  return process.env.STRIPE_COUPON_EDU;
}

export function isStripeConfigured(): boolean {
  return !!getStripe() && !!getStripePriceMonthly();
}

export function getCheckoutUrls() {
  const base = getSiteUrl();
  return {
    success: `${base}/app?upgraded=1`,
    cancel: `${base}/app?upgrade_cancelled=1`,
  };
}
