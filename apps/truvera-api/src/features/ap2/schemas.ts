/**
 * AP2 Tool Schemas — JSON schemas for MCP tool definitions.
 *
 * Unlike v0.1, these tools don't fetch JSON-LD schemas at startup: AP2 v0.2
 * mandates are SD-JWTs identified by a bare `vct` string, not JSON-LD
 * credentials validated against an externally-hosted schema.
 */

const p256JwkSchema = {
  type: "object",
  description: "The Shopping Agent's public JWK, from the Open Payment Mandate's cnf.jwk.",
  properties: {
    kty: { type: "string" },
    crv: { type: "string" },
    x: { type: "string" },
    y: { type: "string" },
  },
  required: ["kty", "crv", "x", "y"],
};

const verifyPaymentMandateProperties = {
  closedPaymentMandatePresentation: {
    type: "string",
    description: "Compact presentation returned by wallet-server's issue_closed_payment_mandate.",
  },
  holderJwk: p256JwkSchema,
  checkoutJwt: {
    type: "string",
    description: "The merchant-signed Checkout JWT, to verify transaction_id against.",
  },
  openPaymentMandatePresentation: {
    type: "string",
    description: "Compact presentation returned by issue_open_payment_mandate, to verify sd_hash against.",
  },
  closedCheckoutMandatePresentation: {
    type: "string",
    description: "Optional: compact presentation returned by issue_closed_checkout_mandate, to also verify the paired Checkout Mandate.",
  },
  openCheckoutMandatePresentation: {
    type: "string",
    description: "Compact presentation returned by issue_open_checkout_mandate, required if closedCheckoutMandatePresentation is supplied.",
  },
};

export const verifyPaymentMandateSchema = {
  type: "object",
  properties: verifyPaymentMandateProperties,
  required: ["closedPaymentMandatePresentation", "holderJwk"],
};

export const issuePaymentTokenSchema = {
  type: "object",
  properties: {
    ...verifyPaymentMandateProperties,
    issuer: {
      type: "string",
      description: "iss claim for the resulting Payment Receipt (e.g. a Truvera-assigned processor id).",
    },
    paymentId: {
      type: "string",
      description: "Unique identifier for this payment, used as the receipt's payment_id.",
    },
    pspConfirmationId: {
      type: "string",
      description: "Transaction confirmation id at the payment service provider.",
    },
    networkConfirmationId: {
      type: "string",
      description: "Transaction confirmation id at the payment network.",
    },
  },
  required: ["closedPaymentMandatePresentation", "holderJwk", "issuer", "paymentId"],
};
