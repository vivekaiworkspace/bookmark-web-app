import { describe, expect, it } from "vitest";
import { hostnameFromUrl, normalizeUrl } from "@/lib/utils";

describe("url helpers", () => {
  it("adds https when the scheme is missing", () => {
    expect(normalizeUrl("example.com/path")).toBe("https://example.com/path");
  });

  it("strips www from hostnames", () => {
    expect(hostnameFromUrl("https://www.example.com/a")).toBe("example.com");
  });
});
