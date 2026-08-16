import { describe, expect, it } from "vitest";
import {
  cronSecretHeaderSchema,
  emptyJsonBodySchema,
  stripeSignatureSchema,
  stripeWebhookBodySchema,
} from "@/lib/schemas";

describe("billing and cron schemas", () => {
  it("rejects unexpected JSON on empty-body routes", () => {
    expect(emptyJsonBodySchema.safeParse({}).success).toBe(true);
    expect(emptyJsonBodySchema.safeParse({ extra: true }).success).toBe(false);
  });

  it("requires a Stripe signature and raw body", () => {
    expect(stripeSignatureSchema.safeParse("").success).toBe(false);
    expect(stripeSignatureSchema.safeParse("t=1,v1=abc").success).toBe(true);
    expect(stripeWebhookBodySchema.safeParse("").success).toBe(false);
    expect(stripeWebhookBodySchema.safeParse("{}").success).toBe(true);
  });

  it("requires a cron secret header", () => {
    expect(cronSecretHeaderSchema.safeParse(null).success).toBe(false);
    expect(cronSecretHeaderSchema.safeParse("secret").success).toBe(true);
  });
});
