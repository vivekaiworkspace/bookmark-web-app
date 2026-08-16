import { describe, expect, it } from "vitest";
import { collectionLimit, isPro, normalizePlan, tagLimit } from "@/lib/plan";

describe("plan gates", () => {
  it("treats unknown plans as free", () => {
    expect(normalizePlan("enterprise")).toBe("free");
    expect(isPro("free")).toBe(false);
  });

  it("lifts collection and tag caps for Pro", () => {
    expect(collectionLimit("free")).toBe(3);
    expect(tagLimit("free")).toBe(10);
    expect(collectionLimit("pro")).toBeGreaterThan(10);
    expect(isPro("pro")).toBe(true);
  });
});
