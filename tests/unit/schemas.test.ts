import { describe, it, expect } from "vitest";
import { components as messaging } from "../../src/features/messaging/schemas.js";
import { components as profiles } from "../../src/features/profiles/schemas.js";
import { components as presentations } from "../../src/features/presentations/schemas.js";

describe("Feature schema shapes", () => {
  it("send message request should require 'to' and 'message'", () => {
    const req = (messaging as any).schemas.SendMessageRequest;
    expect(req).toBeDefined();
    expect(req.required).toEqual(expect.arrayContaining(["to", "message"]));
    expect(req.properties.message).toBeDefined();
    // message should allow string or object or DIDCommMessage ref
    expect(req.properties.message.oneOf).toBeDefined();
  });

  it("update profile should reference Profile in body", () => {
    const req = (profiles as any).schemas.UpdateProfileRequest;
    expect(req).toBeDefined();
    expect(req.properties.body).toBeDefined();
    expect(req.properties.body.$ref).toBe(`#/components/schemas/Profile`);
  });

  it("proof request payload request property should allow arbitrary properties", () => {
    const payload = (presentations as any).schemas.ProofRequestPayload;
    expect(payload).toBeDefined();
    expect(payload.properties.request).toBeDefined();
    expect(payload.properties.request.additionalProperties).toBe(true);
  });
});
