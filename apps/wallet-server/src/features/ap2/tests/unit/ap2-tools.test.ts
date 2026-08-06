import { describe, it, expect, vi, beforeEach } from "vitest";
import { ap2ToolDefs, getAP2Handlers } from "../../tools.js";
import type { AP2Client } from "../../client.js";

describe("unit: ap2 tools (wallet-server)", () => {
  let mockClient: AP2Client;

  beforeEach(() => {
    mockClient = {
      createSigningKey: vi.fn(),
      issueOpenCheckoutMandate: vi.fn(),
      issueClosedCheckoutMandate: vi.fn(),
      issueOpenPaymentMandate: vi.fn(),
      issueClosedPaymentMandate: vi.fn(),
    } as any;
  });

  describe("tool definitions", () => {
    it("exports the correct tool names", () => {
      const names = ap2ToolDefs.map((t) => t.name);
      expect(names).toContain("create_ap2_signing_key");
      expect(names).toContain("issue_open_checkout_mandate");
      expect(names).toContain("issue_closed_checkout_mandate");
      expect(names).toContain("issue_open_payment_mandate");
      expect(names).toContain("issue_closed_payment_mandate");
      expect(names).toHaveLength(5);
    });

    it("each tool has name, title, description, and inputSchema", () => {
      ap2ToolDefs.forEach((tool) => {
        expect(tool).toHaveProperty("name");
        expect(tool).toHaveProperty("title");
        expect(tool).toHaveProperty("description");
        expect(tool).toHaveProperty("inputSchema");
        expect(tool.inputSchema).toHaveProperty("type", "object");
      });
    });

    it("create_ap2_signing_key requires controller", () => {
      const tool = ap2ToolDefs.find((t) => t.name === "create_ap2_signing_key")!;
      expect((tool.inputSchema as any).required).toContain("controller");
    });

    it("issue_closed_payment_mandate requires the full payment shape", () => {
      const tool = ap2ToolDefs.find((t) => t.name === "issue_closed_payment_mandate")!;
      const required = (tool.inputSchema as any).required as string[];
      expect(required).toEqual(
        expect.arrayContaining([
          "keyId",
          "checkoutJwt",
          "payee",
          "paymentAmount",
          "paymentInstrument",
          "nonce",
          "openMandatePresentation",
          "openMandateIssuerPublicJwk",
        ])
      );
    });
  });

  describe("handlers", () => {
    it("create_ap2_signing_key returns the client's result", async () => {
      (mockClient.createSigningKey as any).mockResolvedValue({
        keyId: "key-1",
        publicJwk: { kty: "EC", crv: "P-256", x: "x", y: "y" },
      });

      const handlers = getAP2Handlers(mockClient);
      const result = await handlers.get("create_ap2_signing_key")!({ controller: "did:key:abc" });

      expect(mockClient.createSigningKey).toHaveBeenCalledWith({ controller: "did:key:abc" });
      const body = JSON.parse(result.content[0].text);
      expect(body).toMatchObject({ success: true, keyId: "key-1" });
    });

    it("issue_open_checkout_mandate returns the client's presentation", async () => {
      (mockClient.issueOpenCheckoutMandate as any).mockResolvedValue({ presentation: "jwt~d1~d2~" });

      const handlers = getAP2Handlers(mockClient);
      const params = {
        keyId: "key-1",
        publicJwk: { kty: "EC", crv: "P-256", x: "x", y: "y" },
        constraints: [{ type: "checkout.allowed_merchants", allowed: [] }],
      };
      const result = await handlers.get("issue_open_checkout_mandate")!(params);

      expect(mockClient.issueOpenCheckoutMandate).toHaveBeenCalledWith(params);
      const body = JSON.parse(result.content[0].text);
      expect(body).toEqual({ success: true, presentation: "jwt~d1~d2~" });
    });

    it("returns an error result when the client throws", async () => {
      (mockClient.issueClosedCheckoutMandate as any).mockRejectedValue(new Error("boom"));

      const handlers = getAP2Handlers(mockClient);
      const result = await handlers.get("issue_closed_checkout_mandate")!({
        keyId: "key-1",
        checkoutJwt: "jwt",
        nonce: "n",
        openMandatePresentation: "p",
      });

      expect(result.isError).toBe(true);
      const body = JSON.parse(result.content[0].text);
      expect(body).toEqual({ success: false, error: "boom" });
    });
  });
});
