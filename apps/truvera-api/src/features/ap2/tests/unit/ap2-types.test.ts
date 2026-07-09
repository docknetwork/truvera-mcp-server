/**
 * AP2 Types Tests
 * Unit tests for AP2 TypeScript types
 */

import { describe, it, expect } from "vitest";
import type {
  CartMandate,
  IntentMandate,
  PaymentMandate,
} from "../../types.js";
import { MandateType as MandateTypeEnum } from "../../types.js";

describe("AP2 Types", () => {
  describe("MandateType enum", () => {
    it("should have three mandate types", () => {
      expect(MandateTypeEnum.CART).toBe("CartMandate");
      expect(MandateTypeEnum.INTENT).toBe("IntentMandate");
      expect(MandateTypeEnum.PAYMENT).toBe("PaymentMandate");
    });
  });

  describe("CartMandate", () => {
    it("should accept valid cart mandate structure", () => {
      const mandate: CartMandate = {
        contents: {
          id: "cart_123",
          user_signature_required: true,
          payment_request: {
            method_data: [
              {
                supported_methods: "CARD",
                data: {
                  payment_processor_url: "https://example.com/pay",
                },
              },
            ],
            details: {
              id: "order_123",
              displayItems: [
                {
                  label: "Test Item",
                  amount: {
                    currency: "USD",
                    value: 100,
                  },
                },
              ],
              total: {
                label: "Total",
                amount: {
                  currency: "USD",
                  value: 100,
                },
              },
            },
            options: {
              requestShipping: true,
            },
          },
        },
        merchant_signature: "sig_123",
        timestamp: new Date().toISOString(),
      };

      expect(mandate.contents.id).toBe("cart_123");
      expect(mandate.contents.payment_request.details.total.amount.value).toBe(100);
    });
  });

  describe("IntentMandate", () => {
    it("should accept valid intent mandate structure", () => {
      const mandate: IntentMandate = {
        contents: {
          id: "intent_123",
          payer_id: "did:example:payer",
          shopping_intent: {
            prompt: "Buy concert tickets when available",
            budget_max: {
              currency: "USD",
              value: 1000,
            },
          },
          ttl: 3600,
          timestamp: new Date().toISOString(),
        },
        timestamp: new Date().toISOString(),
      };

      expect(mandate.contents.id).toBe("intent_123");
      expect(mandate.contents.shopping_intent.prompt).toContain("concert");
    });
  });

  describe("PaymentMandate", () => {
    it("should accept valid payment mandate structure", () => {
      const mandate: PaymentMandate = {
        paymentMandateContents: {
          paymentMandateId: "pm_123",
          paymentDetailsId: "order_123",
          paymentDetailsTotal: {
            label: "Total",
            amount: {
              currency: "USD",
              value: "100.00",
            },
          },
          paymentResponse: {
            requestId: "order_123",
            methodName: "CARD",
            details: {
              token: "tok_123",
            },
          },
          humanPresent: true,
          timestamp: new Date().toISOString(),
        },
        userAuthorization: "auth_123",
      };

      expect(mandate.paymentMandateContents.paymentMandateId).toBe("pm_123");
      expect(mandate.paymentMandateContents.humanPresent).toBe(true);
    });
  });
});
