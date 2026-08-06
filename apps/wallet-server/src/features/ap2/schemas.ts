/**
 * JSON Schemas for AP2 mandate tool inputs
 */

const p256JwkSchema = {
  type: "object" as const,
  description:
    "The P-256 public JWK returned by create_ap2_signing_key, used as the mandate's cnf holder key -- this is the key that will later CLOSE this mandate (typically the Shopping Agent's key, for human-not-present flows). This is deliberately a DIFFERENT identity from keyId, which signs/authorizes the mandate (typically the User).",
  properties: {
    kty: { type: "string", const: "EC" },
    crv: { type: "string", const: "P-256" },
    x: { type: "string" },
    y: { type: "string" },
  },
  required: ["kty", "crv", "x", "y"],
};

const merchantSchema = {
  type: "object" as const,
  properties: {
    id: { type: "string", description: "Unique identifier for the merchant." },
    name: { type: "string", description: "Human-readable name of the merchant." },
    website: { type: "string", description: "Website belonging to the merchant." },
  },
  required: ["id", "name"],
};

const lineItemSchema = {
  type: "object" as const,
  properties: {
    id: { type: "string", description: "Unique identifier for this line item." },
    quantity: { type: "integer", minimum: 1 },
    acceptableItems: {
      type: "array" as const,
      description: "Products that would satisfy this line item.",
      items: {
        type: "object" as const,
        properties: {
          id: { type: "string", description: "SKU or other unique product identifier." },
          title: { type: "string" },
        },
        required: ["id", "title"],
      },
    },
  },
  required: ["id", "quantity", "acceptableItems"],
};

// Raw constraint objects (constraints/additionalConstraints) are passed
// straight through to buildOpenCheckoutMandate unchanged -- no camelCase to
// snake_case remapping happens for them the way it does for lineItems/
// allowedMerchants below -- so this must mirror the AP2 protocol's own
// field names (acceptable_items) exactly, not lineItemSchema's camelCase
// (acceptableItems), which is only correct for the named lineItems param.
const rawLineItemSchema = {
  type: "object" as const,
  properties: {
    id: { type: "string", description: "Unique identifier for this line item." },
    quantity: { type: "integer", minimum: 1 },
    acceptable_items: {
      type: "array" as const,
      description: "Products that would satisfy this line item.",
      items: {
        type: "object" as const,
        properties: {
          id: { type: "string", description: "SKU or other unique product identifier." },
          title: { type: "string" },
        },
        required: ["id", "title"],
      },
    },
  },
  required: ["id", "quantity", "acceptable_items"],
};

// Option A: a discriminated union (oneOf keyed on "type") replacing the
// previous free-form `{type: string, ...}` passthrough, so a tool-calling
// model gets the actual field names/shapes per constraint type instead of
// having to recall them from the AP2 spec or prose. This is only the escape
// hatch shape now (raw constraints/additionalConstraints) -- the common
// checkout constraint types are promoted to lineItems/allowedMerchants
// below (Option B).
const checkoutLineItemsConstraintSchema = {
  type: "object" as const,
  properties: {
    type: { const: "checkout.line_items" },
    items: { type: "array" as const, minItems: 1, items: rawLineItemSchema },
  },
  required: ["type", "items"],
};

const checkoutAllowedMerchantsConstraintSchema = {
  type: "object" as const,
  properties: {
    type: { const: "checkout.allowed_merchants" },
    allowed: { type: "array" as const, items: merchantSchema },
  },
  required: ["type", "allowed"],
};

export const checkoutConstraintsSchema = {
  type: "array" as const,
  description: "Raw AP2 checkout constraint objects (checkout.line_items, checkout.allowed_merchants). Prefer lineItems/allowedMerchants when possible.",
  items: { oneOf: [checkoutLineItemsConstraintSchema, checkoutAllowedMerchantsConstraintSchema] },
};

const lineItemsSchema = {
  type: "array" as const,
  description: "Assembled into a checkout.line_items constraint. At least one entry is required by the mandate schema.",
  items: lineItemSchema,
};

const allowedMerchantsSchema = {
  type: "array" as const,
  description: "Assembled into a checkout.allowed_merchants constraint.",
  items: merchantSchema,
};

const paymentInstrumentSchema = {
  type: "object" as const,
  properties: {
    id: { type: "string", description: "Unique identifier for this instrument." },
    type: { type: "string", description: "Category of instrument, e.g. 'card'." },
    description: { type: "string", description: "Displayed to the user for informational purposes." },
  },
  required: ["id", "type"],
};

const paymentBudgetConstraintSchema = {
  type: "object" as const,
  properties: {
    type: { const: "payment.budget" },
    max: { type: "number", description: "Maximum amount for the budget, in minor units." },
    currency: { type: "string", description: "ISO 4217 alpha-3 currency code." },
  },
  required: ["type", "max", "currency"],
};

const paymentAllowedPayeesConstraintSchema = {
  type: "object" as const,
  properties: {
    type: { const: "payment.allowed_payees" },
    allowed: { type: "array" as const, items: merchantSchema },
  },
  required: ["type", "allowed"],
};

const paymentAllowedPaymentInstrumentsConstraintSchema = {
  type: "object" as const,
  properties: {
    type: { const: "payment.allowed_payment_instruments" },
    allowed: { type: "array" as const, items: paymentInstrumentSchema },
  },
  required: ["type", "allowed"],
};

const paymentReferenceConstraintSchema = {
  type: "object" as const,
  properties: {
    type: { const: "payment.reference" },
    conditional_transaction_id: { type: "string", description: "Digest of the associated Open Checkout Mandate." },
  },
  required: ["type", "conditional_transaction_id"],
};

const paymentAmountRangeConstraintSchema = {
  type: "object" as const,
  properties: {
    type: { const: "payment.amount_range" },
    currency: { type: "string", description: "ISO 4217 alpha-3 currency code." },
    max: { type: "integer", description: "Maximum allowed amount in minor units." },
    min: { type: "integer", description: "Minimum allowed amount in minor units. Omit for no minimum." },
  },
  required: ["type", "currency", "max"],
};

const paymentAgentRecurrenceConstraintSchema = {
  type: "object" as const,
  properties: {
    type: { const: "payment.agent_recurrence" },
    frequency: {
      type: "string",
      enum: ["ON_DEMAND", "DAILY", "WEEKLY", "BIWEEKLY", "MONTHLY", "QUARTERLY", "ANNUALLY"],
    },
    max_occurrences: { type: "integer" },
  },
  required: ["type", "frequency"],
};

const paymentExecutionDateConstraintSchema = {
  type: "object" as const,
  properties: {
    type: { const: "payment.execution_date" },
    not_before: { type: "string", description: "ISO 8601 earliest valid execution date." },
    not_after: { type: "string", description: "ISO 8601 latest valid execution date." },
  },
  required: ["type"],
};

const paymentAllowedPispsConstraintSchema = {
  type: "object" as const,
  properties: {
    type: { const: "payment.allowed_pisps" },
    allowed: {
      type: "array" as const,
      items: {
        type: "object" as const,
        properties: {
          legal_name: { type: "string" },
          brand_name: { type: "string" },
          domain_name: { type: "string" },
        },
        required: ["legal_name", "brand_name", "domain_name"],
      },
    },
  },
  required: ["type", "allowed"],
};

export const paymentConstraintsSchema = {
  type: "array" as const,
  description: "Raw AP2 payment constraint objects (payment.budget, payment.allowed_payees, payment.allowed_payment_instruments, payment.reference, payment.amount_range, payment.agent_recurrence, payment.execution_date, payment.allowed_pisps). Prefer the named fields when possible.",
  items: {
    oneOf: [
      paymentBudgetConstraintSchema,
      paymentAllowedPayeesConstraintSchema,
      paymentAllowedPaymentInstrumentsConstraintSchema,
      paymentReferenceConstraintSchema,
      paymentAmountRangeConstraintSchema,
      paymentAgentRecurrenceConstraintSchema,
      paymentExecutionDateConstraintSchema,
      paymentAllowedPispsConstraintSchema,
    ],
  },
};

const budgetSchema = {
  type: "object" as const,
  description: "Assembled into a payment.budget constraint.",
  properties: {
    max: { type: "number", description: "Maximum amount for the budget, in minor units." },
    currency: { type: "string", description: "ISO 4217 alpha-3 currency code." },
  },
  required: ["max", "currency"],
};

const allowedPayeesSchema = {
  type: "array" as const,
  description: "Assembled into a payment.allowed_payees constraint.",
  items: merchantSchema,
};

const allowedPaymentInstrumentsSchema = {
  type: "array" as const,
  description: "Assembled into a payment.allowed_payment_instruments constraint.",
  items: paymentInstrumentSchema,
};

const referenceSchema = {
  type: "object" as const,
  description: "Assembled into a payment.reference constraint. Required by the mandate schema.",
  properties: {
    conditionalTransactionId: { type: "string", description: "Digest of the associated Open Checkout Mandate." },
  },
  required: ["conditionalTransactionId"],
};

const amountRangeSchema = {
  type: "object" as const,
  description: "Assembled into a payment.amount_range constraint.",
  properties: {
    currency: { type: "string", description: "ISO 4217 alpha-3 currency code." },
    max: { type: "integer", description: "Maximum allowed amount in minor units." },
    min: { type: "integer", description: "Minimum allowed amount in minor units. Omit for no minimum." },
  },
  required: ["currency", "max"],
};

const agentRecurrenceSchema = {
  type: "object" as const,
  description: "Assembled into a payment.agent_recurrence constraint.",
  properties: {
    frequency: {
      type: "string",
      enum: ["ON_DEMAND", "DAILY", "WEEKLY", "BIWEEKLY", "MONTHLY", "QUARTERLY", "ANNUALLY"],
    },
    maxOccurrences: { type: "integer" },
  },
  required: ["frequency"],
};

const executionDateSchema = {
  type: "object" as const,
  description: "Assembled into a payment.execution_date constraint.",
  properties: {
    notBefore: { type: "string", description: "ISO 8601 earliest valid execution date." },
    notAfter: { type: "string", description: "ISO 8601 latest valid execution date." },
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
    lineItems: lineItemsSchema,
    allowedMerchants: allowedMerchantsSchema,
    constraints: checkoutConstraintsSchema,
    additionalConstraints: checkoutConstraintsSchema,
    exp: {
      type: "integer",
      description: "Expiration as a Unix epoch. Omit for a mandate with no expiration.",
    },
  },
  required: ["keyId", "publicJwk"],
  // The mandate schema requires at least one checkout.line_items constraint --
  // satisfiable via lineItems, or via a checkout.line_items entry inside
  // constraints/additionalConstraints (not itself checked here; that's left
  // to buildOpenCheckoutMandate's own validation, same as always).
  anyOf: [{ required: ["lineItems"] }, { required: ["constraints"] }, { required: ["additionalConstraints"] }],
  examples: [
    {
      keyId: "did:key:zUser#ap2-key-1",
      publicJwk: { kty: "EC", crv: "P-256", x: "...", y: "..." },
      lineItems: [
        {
          id: "line_1",
          quantity: 1,
          acceptableItems: [{ id: "SKU-1", title: "Wireless Mouse" }],
        },
      ],
      allowedMerchants: [{ id: "merchant_1", name: "Acme Electronics", website: "https://acme.example" }],
    },
  ],
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
    openMandateIssuerPublicJwk: {
      ...p256JwkSchema,
      description: "The public JWK of the User's key that signed the referenced Open Checkout Mandate (i.e. the publicJwk from the create_ap2_signing_key call for the keyId originally passed to issue_open_checkout_mandate). Verified against that Open Mandate's own issuer signature before this close is trusted.",
    },
  },
  required: ["keyId", "checkoutJwt", "nonce", "openMandatePresentation", "openMandateIssuerPublicJwk"],
};

export const issueOpenPaymentMandateSchema = {
  type: "object" as const,
  properties: {
    keyId: {
      type: "string",
      description: "id of a key created via create_ap2_signing_key (the user's signing key).",
    },
    publicJwk: p256JwkSchema,
    reference: referenceSchema,
    budget: budgetSchema,
    allowedPayees: allowedPayeesSchema,
    allowedPaymentInstruments: allowedPaymentInstrumentsSchema,
    amountRange: amountRangeSchema,
    agentRecurrence: agentRecurrenceSchema,
    executionDate: executionDateSchema,
    constraints: paymentConstraintsSchema,
    additionalConstraints: paymentConstraintsSchema,
    exp: {
      type: "integer",
      description: "Expiration as a Unix epoch. Omit for a mandate with no expiration.",
    },
  },
  required: ["keyId", "publicJwk"],
  // The mandate schema requires a payment.reference constraint -- satisfiable
  // via reference, or via a payment.reference entry inside
  // constraints/additionalConstraints (not itself checked here; that's left
  // to buildOpenPaymentMandate's own validation, same as always).
  anyOf: [{ required: ["reference"] }, { required: ["constraints"] }, { required: ["additionalConstraints"] }],
  examples: [
    {
      keyId: "did:key:zUser#ap2-key-2",
      publicJwk: { kty: "EC", crv: "P-256", x: "...", y: "..." },
      reference: { conditionalTransactionId: "digest-1" },
      budget: { max: 5000, currency: "USD" },
      allowedPayees: [{ id: "merchant_1", name: "Acme Electronics", website: "https://acme.example" }],
    },
  ],
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
    openMandateIssuerPublicJwk: {
      ...p256JwkSchema,
      description: "The public JWK of the User's key that signed the referenced Open Payment Mandate (i.e. the publicJwk from the create_ap2_signing_key call for the keyId originally passed to issue_open_payment_mandate). Verified against that Open Mandate's own issuer signature before this close is trusted.",
    },
  },
  required: [
    "keyId",
    "checkoutJwt",
    "payee",
    "paymentAmount",
    "paymentInstrument",
    "nonce",
    "openMandatePresentation",
    "openMandateIssuerPublicJwk",
  ],
};
