import { describe, it, expect } from "vitest";
import { components as profiles } from "../schemas.js";

describe("profiles schema shapes", () => {
  it("update profile should reference Profile in body", () => {
    const req = (profiles as any).schemas.UpdateProfileRequest;
    expect(req).toBeDefined();
    expect(req.properties.body).toBeDefined();
    expect(req.properties.body.$ref).toBe(`#/components/schemas/Profile`);
  });
});
