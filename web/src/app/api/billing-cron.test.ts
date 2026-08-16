import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/notify", () => ({
  dispatchNotifications: vi.fn(),
}));

vi.mock("@/lib/stripe", () => ({
  stripeConfigured: vi.fn(),
  getStripe: vi.fn(),
  appUrl: () => "http://localhost:3000",
}));

import { POST as notifyPost } from "@/app/api/cron/notify/route";
import { POST as webhookPost } from "@/app/api/stripe/webhook/route";
import { POST as checkoutPost } from "@/app/api/stripe/checkout/route";
import { dispatchNotifications } from "@/lib/notify";
import { getStripe, stripeConfigured } from "@/lib/stripe";

describe("cron notify route", () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
    vi.clearAllMocks();
  });

  it("returns 401 without a valid cron secret", async () => {
    vi.stubEnv("CRON_SECRET", "expected");
    const res = await notifyPost(
      new Request("http://localhost/api/cron/notify", { method: "POST" }),
    );
    expect(res.status).toBe(401);
  });

  it("returns 200 when the secret matches", async () => {
    vi.stubEnv("CRON_SECRET", "expected");
    vi.mocked(dispatchNotifications).mockResolvedValue({
      reminders: 0,
      digests: 0,
    });
    const res = await notifyPost(
      new Request("http://localhost/api/cron/notify", {
        method: "POST",
        headers: { "x-cron-secret": "expected" },
      }),
    );
    expect(res.status).toBe(200);
  });
});

describe("stripe webhook route", () => {
  it("returns 503 when Stripe is not configured", async () => {
    vi.mocked(getStripe).mockReturnValue(null);
    const res = await webhookPost(
      new Request("http://localhost/api/stripe/webhook", {
        method: "POST",
        body: "{}",
        headers: { "stripe-signature": "sig" },
      }),
    );
    expect(res.status).toBe(503);
  });

  it("returns 400 when the signature header is missing", async () => {
    vi.mocked(getStripe).mockReturnValue({} as never);
    vi.stubEnv("STRIPE_WEBHOOK_SECRET", "whsec");
    const res = await webhookPost(
      new Request("http://localhost/api/stripe/webhook", {
        method: "POST",
        body: "{}",
      }),
    );
    expect(res.status).toBe(400);
  });
});

describe("stripe checkout route", () => {
  it("returns 503 when Stripe is not configured", async () => {
    vi.mocked(stripeConfigured).mockReturnValue(false);
    const res = await checkoutPost(
      new Request("http://localhost/api/stripe/checkout", { method: "POST" }),
    );
    expect(res.status).toBe(503);
  });

  it("returns 400 for unexpected JSON", async () => {
    vi.mocked(stripeConfigured).mockReturnValue(true);
    const res = await checkoutPost(
      new Request("http://localhost/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ extra: true }),
      }),
    );
    expect(res.status).toBe(400);
  });
});
