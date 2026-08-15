import { FREE_COLLECTION_LIMIT, FREE_TAG_LIMIT } from "@/lib/limits";

export type Plan = "free" | "pro";

export function normalizePlan(value: string | null | undefined): Plan {
  return value === "pro" ? "pro" : "free";
}

export function isPro(plan: Plan) {
  return plan === "pro";
}

export function collectionLimit(plan: Plan) {
  return isPro(plan) ? Number.MAX_SAFE_INTEGER : FREE_COLLECTION_LIMIT;
}

export function tagLimit(plan: Plan) {
  return isPro(plan) ? Number.MAX_SAFE_INTEGER : FREE_TAG_LIMIT;
}

export function limitLabel(limit: number) {
  return limit >= Number.MAX_SAFE_INTEGER ? "Unlimited" : String(limit);
}
