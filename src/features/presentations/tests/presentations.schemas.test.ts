import { describe, it, expect } from "vitest";
import { components as presentations } from "../schemas.js";

describe("presentations schema shapes", () => {
  it("proof request payload request property should allow arbitrary properties", () => {
    const payload = (presentations as any).schemas.ProofRequestPayload;
    expect(payload).toBeDefined();
    expect(payload.properties.request).toBeDefined();
    expect(payload.properties.request.additionalProperties).toBe(true);
  });
});
