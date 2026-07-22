/**
 * JSON Schemas for AP2 mandate tool inputs
 */

const p256JwkSchema = {
  type: "object" as const,
  description: "The P-256 public JWK returned by create_ap2_signing_key, used as the mandate's cnf holder key.",
  properties: {
    kty: { type: "string", const: "EC" },
    crv: { type: "string", const: "P-256" },
    x: { type: "string" },
    y: { type: "string" },
  },
  required: ["kty", "crv", "x", "y"],
};

const constraintsSchema = {
  type: "array" as const,
  description: "AP2 constraint objects (e.g. checkout.line_items, checkout.allowed_merchants, payment.amount_range, payment.allowed_payees, payment.reference). Each must have a 'type' field; other properties depend on the constraint type.",
  items: {
    type: "object" as const,
    properties: { type: { type: "string" } },
    required: ["type"],
    additionalProperties: true,
  },
};

export const createAP2SigningKeySchema = {
  type: "object" as const,
  properties: {
    controller: {
      type: "string",
      description: "DID this signing key is attached to. Must already exist in the wallet.",
    },
  },
  required: ["controller"],
};

export const issueOpenCheckoutMandateSchema = {
  type: "object" as const,
  properties: {
    keyId: {
      type: "string",
      description: "id of a key created via create_ap2_signing_key (the user's signing key, per AP2's Trusted Surface role).",
    },
    publicJwk: p256JwkSchema,
    constraints: constraintsSchema,
    exp: {
      type: "integer",
      description: "Expiration as a Unix epoch. Omit for a mandate with no expiration.",
    },
  },
  required: ["keyId", "publicJwk", "constraints"],
};

export const issueClosedCheckoutMandateSchema = {
  type: "object" as const,
  properties: {
    keyId: {
      type: "string",
      description: "id of the Shopping Agent's signing key (created via create_ap2_signing_key), distinct from the user's key that signed the referenced Open Checkout Mandate.",
    },
    checkoutJwt: {
      type: "string",
      description: "The merchant-signed Checkout JWT being authorized.",
    },
    nonce: {
      type: "string",
      description: "Merchant-supplied nonce for this closing.",
    },
    openMandatePresentation: {
      type: "string",
      description: "The compact presentation string returned by issue_open_checkout_mandate.",
    },
  },
  required: ["keyId", "checkoutJwt", "nonce", "openMandatePresentation"],
};

export const issueOpenPaymentMandateSchema = {
  type: "object" as const,
  properties: {
    keyId: {
      type: "string",
      description: "id of a key created via create_ap2_signing_key (the user's signing key).",
    },
    publicJwk: p256JwkSchema,
    constraints: constraintsSchema,
    exp: {
      type: "integer",
      description: "Expiration as a Unix epoch. Omit for a mandate with no expiration.",
    },
  },
  required: ["keyId", "publicJwk", "constraints"],
};

export const issueClosedPaymentMandateSchema = {
  type: "object" as const,
  properties: {
    keyId: {
      type: "string",
      description: "id of the Shopping Agent's signing key (created via create_ap2_signing_key).",
    },
    checkoutJwt: {
      type: "string",
      description: "The same Checkout JWT bound in the corresponding Closed Checkout Mandate. Used to compute transaction_id.",
    },
    payee: {
      type: "object" as const,
      properties: {
        id: { type: "string" },
        name: { type: "string" },
        website: { type: "string" },
      },
      required: ["id", "name"],
    },
    paymentAmount: {
      type: "object" as const,
      properties: {
        amount: { type: "number" },
        currency: { type: "string" },
      },
      required: ["amount", "currency"],
    },
    paymentInstrument: {
      type: "object" as const,
      properties: {
        id: { type: "string" },
        type: { type: "string" },
        description: { type: "string" },
      },
      required: ["id", "type"],
    },
    nonce: {
      type: "string",
      description: "Credential Provider-supplied nonce for this closing.",
    },
    openMandatePresentation: {
      type: "string",
      description: "The compact presentation string returned by issue_open_payment_mandate.",
    },
  },
  required: ["keyId", "checkoutJwt", "payee", "paymentAmount", "paymentInstrument", "nonce", "openMandatePresentation"],
};
