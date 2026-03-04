/**
 * AP2 Schema Tests
 * Unit tests for AP2 tool schemas
 */

import { describe, it, expect } from "vitest";
import { components } from "../../schemas.js";

describe("AP2 Schemas", () => {
  describe("IssueCartMandateRequest", () => {
    it("should have required fields defined", () => {
      const schema = components.schemas.IssueCartMandateRequest;
      
      expect(schema.type).toBe("object");
      expect(schema.required).toContain("mandate_id");
      expect(schema.required).toContain("cart_items");
      expect(schema.required).toContain("total_amount");
      expect(schema.required).toContain("payment_method");
      expect(schema.required).toContain("merchant_id");
      expect(schema.required).toContain("payer_id");
      expect(schema.required).toContain("issuer_did");
      expect(schema.required).toContain("subject_did");
    });

    it("should have cart_items as array", () => {
      const schema = components.schemas.IssueCartMandateRequest;
      
      expect(schema.properties.cart_items.type).toBe("array");
      expect(schema.properties.cart_items.items).toBeDefined();
    });
  });

  describe("IssueIntentMandateRequest", () => {
    it("should have required fields defined", () => {
      const schema = components.schemas.IssueIntentMandateRequest;
      
      expect(schema.type).toBe("object");
      expect(schema.required).toContain("mandate_id");
      expect(schema.required).toContain("shopping_prompt");
      expect(schema.required).toContain("budget_max_currency");
      expect(schema.required).toContain("budget_max_value");
      expect(schema.required).toContain("payer_id");
      expect(schema.required).toContain("issuer_did");
      expect(schema.required).toContain("subject_did");
    });

    it("should have optional product_categories as array", () => {
      const schema = components.schemas.IssueIntentMandateRequest;
      
      expect(schema.properties.product_categories.type).toBe("array");
      expect(schema.required).not.toContain("product_categories");
    });
  });

  describe("IssuePaymentMandateRequest", () => {
    it("should have required fields defined", () => {
      const schema = components.schemas.IssuePaymentMandateRequest;
      
      expect(schema.type).toBe("object");
      expect(schema.required).toContain("payment_mandate_id");
      expect(schema.required).toContain("payment_details_id");
      expect(schema.required).toContain("total_currency");
      expect(schema.required).toContain("total_value");
      expect(schema.required).toContain("payment_method");
      expect(schema.required).toContain("human_present");
      expect(schema.required).toContain("issuer_did");
      expect(schema.required).toContain("subject_did");
    });

    it("should have human_present as boolean", () => {
      const schema = components.schemas.IssuePaymentMandateRequest;
      
      expect(schema.properties.human_present.type).toBe("boolean");
    });
  });

  describe("VerifyMandateRequest", () => {
    it("should have required credential_id field", () => {
      const schema = components.schemas.VerifyMandateRequest;
      
      expect(schema.type).toBe("object");
      expect(schema.required).toContain("credential_id");
      expect(schema.properties.credential_id.type).toBe("string");
    });
  });
});
