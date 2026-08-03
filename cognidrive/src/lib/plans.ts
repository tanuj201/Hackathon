export type PlanId = "free" | "pro" | "pro_plus";

export interface PlanLimits {
  id: PlanId;
  name: string;
  storageBytes: number;
  chatPerMonth: number;
  studioPerMonth: number;
  priceMonthly?: number;
  priceYearly?: number;
}

export const PLANS: Record<PlanId, PlanLimits> = {
  free: {
    id: "free",
    name: "Free",
    storageBytes: 250 * 1024 * 1024,
    chatPerMonth: 30,
    studioPerMonth: 9, // ~3 per studio tool
    priceMonthly: 0,
  },
  pro: {
    id: "pro",
    name: "Student Pro",
    storageBytes: 2 * 1024 * 1024 * 1024,
    chatPerMonth: 200,
    studioPerMonth: 30,
    priceMonthly: 1.99,
    priceYearly: 19.99,
  },
  pro_plus: {
    id: "pro_plus",
    name: "Student Pro+",
    storageBytes: 5 * 1024 * 1024 * 1024,
    chatPerMonth: 500,
    studioPerMonth: 50,
    priceMonthly: 4.99,
  },
};

export function getPlanLimits(plan: PlanId): PlanLimits {
  return PLANS[plan] ?? PLANS.free;
}

export function normalizePlan(plan: string | null | undefined): PlanId {
  if (plan === "pro" || plan === "pro_plus") return plan;
  return "free";
}
