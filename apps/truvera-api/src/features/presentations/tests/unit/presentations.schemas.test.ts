import { describe, it, expect } from "vitest";
import { components as presentations } from "../../schemas.js";

describe("unit: presentations schema shapes", () => {
  it("proof request payload request property should allow arbitrary properties", () => {
    const payload = (presentations as any).schemas.ProofRequestPayload;
    expect(payload).toBeDefined();
    expect(payload.properties.request).toBeDefined();
    expect(payload.properties.request.additionalProperties).toBe(true);
  });

  it("get proof request result request requires id", () => {
    const request = (presentations as any).schemas.GetProofRequestResultRequest;
    expect(request).toBeDefined();
    expect(request.required).toContain("id");
    expect(request.properties.id).toBeDefined();
  });
});
