/**
 * AP2 Tool Schemas — JSON schemas for MCP tool definitions.
 *
 * Unlike v0.1, these tools don't fetch JSON-LD schemas at startup: AP2 v0.2
 * mandates are SD-JWTs identified by a bare `vct` string, not JSON-LD
 * credentials validated against an externally-hosted schema.
 */

const p256JwkSchema = {
  type: "object",
  description:
    "The User's own public JWK -- the key that signed the Open Payment (and Open Checkout, if supplied) Mandate. Independently resolved/trusted by the caller (e.g. via DID resolution or a wallet registry), not read out of the mandate presentations themselves.",
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
  userJwk: p256JwkSchema,
  paymentExpectedNonce: {
    type: "string",
    description: "The single-use nonce this Credential Provider generated for this transaction, checked against the Closed Payment Mandate's nonce claim.",
  },
  checkoutJwt: {
    type: "string",
    description: "The merchant-signed Checkout JWT, to verify transaction_id against.",
  },
  openPaymentMandatePresentation: {
    type: "string",
    description: "Compact presentation returned by issue_open_payment_mandate. Required by @docknetwork/ap2's own verification to derive the Shopping Agent's cnf.jwk and check sd_hash.",
  },
  closedCheckoutMandatePresentation: {
    type: "string",
    description: "Optional: compact presentation returned by issue_closed_checkout_mandate, to also verify the paired Checkout Mandate.",
  },
  openCheckoutMandatePresentation: {
    type: "string",
    description: "Compact presentation returned by issue_open_checkout_mandate. Required if closedCheckoutMandatePresentation is supplied; also used, together with openPaymentMandatePresentation, to verify the payment.reference binding.",
  },
  checkoutExpectedNonce: {
    type: "string",
    description: "The merchant-generated single-use nonce checked against the Closed Checkout Mandate's nonce claim. Required if closedCheckoutMandatePresentation is supplied.",
  },
};

// closedCheckoutMandatePresentation, if supplied, needs openCheckoutMandatePresentation
// and checkoutExpectedNonce to actually verify anything -- @docknetwork/ap2's
// verifyClosedCheckoutMandate requires openMandatePresentation unconditionally.
// (mcp-shared's Ajv instance defaults to draft-07, hence "dependencies"
// rather than the newer "dependentRequired" keyword.)
const requiresCheckoutMandateFields = {
  dependencies: {
    closedCheckoutMandatePresentation: ["openCheckoutMandatePresentation", "checkoutExpectedNonce"],
  },
};

export const verifyPaymentMandateSchema = {
  type: "object",
  properties: verifyPaymentMandateProperties,
  required: ["closedPaymentMandatePresentation", "userJwk", "paymentExpectedNonce", "openPaymentMandatePresentation"],
  ...requiresCheckoutMandateFields,
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
  required: [
    "closedPaymentMandatePresentation",
    "userJwk",
    "paymentExpectedNonce",
    "openPaymentMandatePresentation",
    "issuer",
    "paymentId",
  ],
  ...requiresCheckoutMandateFields,
};
