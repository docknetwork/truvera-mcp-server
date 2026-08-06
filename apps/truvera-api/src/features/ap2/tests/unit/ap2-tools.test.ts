import { describe, it, expect, vi, beforeEach } from "vitest";
import { ap2ToolDefs, getAP2Handlers } from "../../tools.js";
import type { AP2Client } from "../../client.js";

const USER_JWK = { kty: "EC", crv: "P-256", x: "x-coordinate", y: "y-coordinate" };

describe("unit: ap2 tools (truvera-api)", () => {
  let mockClient: AP2Client;

  beforeEach(() => {
    mockClient = {
      verifyPaymentMandate: vi.fn(),
      issuePaymentToken: vi.fn(),
    } as any;
  });

  describe("tool definitions", () => {
    it("exports the correct tool names", () => {
      const names = ap2ToolDefs.map((t) => t.name);
      expect(names).toContain("verify_payment_mandate");
      expect(names).toContain("issue_payment_token");
      expect(names).toHaveLength(2);
    });

    it("each tool has name, description, and inputSchema", () => {
      ap2ToolDefs.forEach((tool) => {
        expect(tool).toHaveProperty("name");
        expect(tool).toHaveProperty("description");
        expect(tool).toHaveProperty("inputSchema");
        expect(tool.inputSchema).toHaveProperty("type", "object");
      });
    });

    it("verify_payment_mandate requires closedPaymentMandatePresentation, userJwk, paymentExpectedNonce, and openPaymentMandatePresentation", () => {
      const tool = ap2ToolDefs.find((t) => t.name === "verify_payment_mandate")!;
      const required = (tool.inputSchema as any).required as string[];
      expect(required).toContain("closedPaymentMandatePresentation");
      expect(required).toContain("userJwk");
      expect(required).toContain("paymentExpectedNonce");
      expect(required).toContain("openPaymentMandatePresentation");
    });

    it("issue_payment_token additionally requires issuer and paymentId", () => {
      const tool = ap2ToolDefs.find((t) => t.name === "issue_payment_token")!;
      const required = (tool.inputSchema as any).required as string[];
      expect(required).toContain("issuer");
      expect(required).toContain("paymentId");
    });
  });

  describe("handlers", () => {
    it("verify_payment_mandate returns the client's result", async () => {
      (mockClient.verifyPaymentMandate as any).mockResolvedValue({ paymentMandateVerified: true });

      const handlers = getAP2Handlers(mockClient);
      const params = { closedPaymentMandatePresentation: "jwt~d~", userJwk: USER_JWK, paymentExpectedNonce: "nonce-1" };
      const result = await handlers.get("verify_payment_mandate")!(params);

      expect(mockClient.verifyPaymentMandate).toHaveBeenCalledWith(params);
      const body = JSON.parse(result.content[0].text);
      expect(body).toEqual({ paymentMandateVerified: true });
    });

    it("issue_payment_token returns the client's result", async () => {
      (mockClient.issuePaymentToken as any).mockResolvedValue({
        verification: { paymentMandateVerified: true },
        signed: false,
      });

      const handlers = getAP2Handlers(mockClient);
      const params = {
        closedPaymentMandatePresentation: "jwt~d~",
        userJwk: USER_JWK, paymentExpectedNonce: "nonce-1",
        issuer: "mpp.acme",
        paymentId: "PAY-001",
      };
      const result = await handlers.get("issue_payment_token")!(params);

      expect(mockClient.issuePaymentToken).toHaveBeenCalledWith(params);
      const body = JSON.parse(result.content[0].text);
      expect(body.signed).toBe(false);
    });
  });
});
