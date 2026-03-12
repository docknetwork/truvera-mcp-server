/**
 * AP2 Tool Schemas
 * JSON schemas for MCP tool definitions
 * Dynamically enhanced with fetched schema information
 */

import { components as shared } from "../shared/schemas.js";
import { getCachedSchema } from "./schema-fetcher.js";

export const components = {
  schemas: {
    ...shared.schemas,

    /**
     * Issue Cart Mandate (Human-Present)
     */
    IssueCartMandateRequest: {
      type: "object",
      description: "Issue a Cart Mandate for human-present payment authorization. The mandate contains exact cart details that the user explicitly approves.",
      properties: {
        mandate_id: {
          type: "string",
          description: "Unique identifier for this cart mandate",
        },
        cart_items: {
          type: "array",
          description: "Array of items in the cart with labels and amounts",
          items: {
            type: "object",
            properties: {
              label: { type: "string", description: "Item description" },
              currency: { type: "string", description: "Currency code (e.g., USD)" },
              value: { type: "number", description: "Item price" },
            },
            required: ["label", "currency", "value"],
          },
        },
        total_amount: {
          type: "object",
          description: "Total amount for the transaction",
          properties: {
            currency: { type: "string", description: "Currency code (e.g., USD)" },
            value: { type: "number", description: "Total amount" },
          },
          required: ["currency", "value"],
        },
        payment_method: {
          type: "string",
          description: "Payment method identifier (e.g., 'CARD', 'BANK_TRANSFER')",
        },
        merchant_id: {
          type: "string",
          description: "Merchant identifier (DID or other identifier)",
        },
        payer_id: {
          type: "string",
          description: "Payer identifier (DID or other identifier)",
        },
        payment_processor_url: {
          type: "string",
          description: "URL of the payment processor endpoint",
        },
        issuer_did: {
          type: "string",
          description: "DID of the credential issuer (must exist in Truvera)",
        },
        subject_did: {
          type: "string",
          description: "Optional: DID of the credential subject (recipient/holder). If provided, credential is issued immediately. If omitted, creates a credential offer for QR code claiming.",
        },
      },
      required: [
        "mandate_id",
        "cart_items",
        "total_amount",
        "payment_method",
        "merchant_id",
        "payer_id",
        "issuer_did",
      ],
    },

    /**
     * Issue Intent Mandate (Human-Not-Present)
     */
    IssueIntentMandateRequest: {
      type: "object",
      description: "Issue an Intent Mandate for human-not-present payment authorization. The mandate contains constraints and shopping intent for an agent to act within.",
      properties: {
        mandate_id: {
          type: "string",
          description: "Unique identifier for this intent mandate",
        },
        shopping_prompt: {
          type: "string",
          description: "Natural language description of what the user wants to purchase",
        },
        budget_max_currency: {
          type: "string",
          description: "Maximum budget currency (e.g., USD)",
        },
        budget_max_value: {
          type: "number",
          description: "Maximum budget amount",
        },
        ttl_seconds: {
          type: "number",
          description: "Time-to-live in seconds before mandate expires",
          default: 3600,
        },
        product_categories: {
          type: "array",
          description: "Optional array of product categories the agent can purchase from",
          items: { type: "string" },
        },
        specific_skus: {
          type: "array",
          description: "Optional array of specific SKUs the agent can purchase",
          items: { type: "string" },
        },
        merchant_preference: {
          type: "string",
          description: "Optional preferred merchant identifier",
        },
        payment_methods: {
          type: "array",
          description: "List of authorized payment methods",
          items: { type: "string" },
        },
        refundable: {
          type: "boolean",
          description: "Whether purchases must be refundable",
        },
        payer_id: {
          type: "string",
          description: "Payer identifier (DID or other identifier)",
        },
        payee_id: {
          type: "string",
          description: "Optional payee identifier (DID or other identifier)",
        },
        issuer_did: {
          type: "string",
          description: "DID of the credential issuer (must exist in Truvera)",
        },
        subject_did: {
          type: "string",
          description: "Optional: DID of the credential subject (recipient/holder). If provided, credential is issued immediately. If omitted, creates a credential offer for QR code claiming.",
        },
      },
      required: [
        "mandate_id",
        "shopping_prompt",
        "budget_max_currency",
        "budget_max_value",
        "payer_id",
        "issuer_did",
      ],
    },

    /**
     * Issue Payment Mandate (Network Visibility)
     */
    IssuePaymentMandateRequest: {
      type: "object",
      description: "Issue a Payment Mandate for payment network visibility into agent involvement. This is sent to networks/issuers alongside the cart/intent mandate.",
      properties: {
        payment_mandate_id: {
          type: "string",
          description: "Unique identifier for this payment mandate",
        },
        payment_details_id: {
          type: "string",
          description: "Reference to the payment details (cart or intent mandate ID)",
        },
        total_currency: {
          type: "string",
          description: "Currency code for the total amount",
        },
        total_value: {
          type: "number",
          description: "Total transaction amount",
        },
        payment_method: {
          type: "string",
          description: "Payment method being used",
        },
        merchant_agent: {
          type: "string",
          description: "Merchant agent identifier",
        },
        shopping_agent: {
          type: "string",
          description: "Shopping agent identifier",
        },
        human_present: {
          type: "boolean",
          description: "Whether the human was present during authorization (true) or not (false)",
        },
        refund_period_days: {
          type: "number",
          description: "Number of days for refund eligibility",
        },
        issuer_did: {
          type: "string",
          description: "DID of the credential issuer (must exist in Truvera)",
        },
        subject_did: {
          type: "string",
          description: "Optional: DID of the credential subject (recipient/holder). If provided, credential is issued immediately. If omitted, creates a credential offer for QR code claiming.",
        },
      },
      required: [
        "payment_mandate_id",
        "payment_details_id",
        "total_currency",
        "total_value",
        "payment_method",
        "human_present",
        "issuer_did",
      ],
    },

    /**
     * Verify Mandate Request
     */
    VerifyMandateRequest: {
      type: "object",
      description: "Verify an AP2 mandate credential using the Truvera API",
      properties: {
        credential_id: {
          type: "string",
          description: "ID of the mandate credential to verify",
        },
      },
      required: ["credential_id"],
    },
  },
};

/**
 * Get enhanced schema with fetched schema URLs for context
 */
export function getSchemaWithContext(schemaKey: keyof typeof components.schemas): {
  schema: unknown;
  schemaUrls: {
    cart?: string;
    intent?: string;
    payment?: string;
  };
} {
  const schema = components.schemas[schemaKey];
  
  const schemaUrls = {
    cart: process.env.AP2_CART_MANDATE_SCHEMA_URL || "https://ap2-protocol.org/schemas/cart-mandate/v1",
    intent: process.env.AP2_INTENT_MANDATE_SCHEMA_URL || "https://ap2-protocol.org/schemas/intent-mandate/v1",
    payment: process.env.AP2_PAYMENT_MANDATE_SCHEMA_URL || "https://ap2-protocol.org/schemas/payment-mandate/v1",
  };
  
  return {
    schema,
    schemaUrls,
  };
}
