import { describe, it, expect } from "vitest";
import { components as messaging } from "../schemas.js";

describe("unit: messaging schema shapes", () => {
  it("send message request should require 'to' and 'message'", () => {
    const req = (messaging as any).schemas.SendMessageRequest;
    expect(req).toBeDefined();
    expect(req.required).toEqual(expect.arrayContaining(["to", "message"]));
    expect(req.properties.message).toBeDefined();
    // message should allow string or object or DIDCommMessage ref
    expect(req.properties.message.oneOf).toBeDefined();
  });
});
