import { describe, it, expect } from "vitest";
import Ajv from "ajv";
import {
  checkoutConstraintsSchema,
  paymentConstraintsSchema,
  issueOpenCheckoutMandateSchema,
  issueOpenPaymentMandateSchema,
} from "../../schemas.js";
import { assembleCheckoutConstraints, assemblePaymentConstraints } from "../../client.js";

// checkoutConstraintsSchema/paymentConstraintsSchema are the raw-constraints
// escape hatch (Option A's discriminated union). These, and the full
// issueOpen*MandateSchema objects below, are now actually enforced at tool-call
// time (via packages/mcp-shared's ajv-backed createCallToolHandler) -- these
// tests validate the schemas' own correctness directly against ajv, the same
// engine and config (`new Ajv({ allErrors: true, strict: false })`) used there.
const ajv = new Ajv({ allErrors: true, strict: false });

describe("unit: AP2 constraint schemas (Option A discriminated union)", () => {
  const validateCheckoutConstraints = ajv.compile(checkoutConstraintsSchema);
  const validatePaymentConstraints = ajv.compile(paymentConstraintsSchema);

  it("accepts a well-formed checkout.line_items constraint", () => {
    const valid = validateCheckoutConstraints([
      {
        type: "checkout.line_items",
        items: [{ id: "line_1", quantity: 1, acceptable_items: [{ id: "SKU-1", title: "Widget" }] }],
      },
    ]);
    expect(valid).toBe(true);
  });

  it("rejects a checkout.line_items constraint using the named-param camelCase acceptableItems instead of the protocol's acceptable_items", () => {
    const valid = validateCheckoutConstraints([
      {
        type: "checkout.line_items",
        items: [{ id: "line_1", quantity: 1, acceptableItems: [{ id: "SKU-1", title: "Widget" }] }],
      },
    ]);
    expect(valid).toBe(false);
  });

  it("accepts a well-formed checkout.allowed_merchants constraint", () => {
    const valid = validateCheckoutConstraints([
      { type: "checkout.allowed_merchants", allowed: [{ id: "merchant_1", name: "Demo Merchant" }] },
    ]);
    expect(valid).toBe(true);
  });

  it("rejects a checkout.line_items constraint missing 'items'", () => {
    const valid = validateCheckoutConstraints([{ type: "checkout.line_items" }]);
    expect(valid).toBe(false);
  });

  it("rejects a checkout constraint with an unrecognized type", () => {
    const valid = validateCheckoutConstraints([{ type: "checkout.not_a_real_type", foo: "bar" }]);
    expect(valid).toBe(false);
  });

  it.each([
    { type: "payment.budget", max: 100, currency: "USD" },
    { type: "payment.allowed_payees", allowed: [{ id: "merchant_1", name: "Demo Merchant" }] },
    { type: "payment.allowed_payment_instruments", allowed: [{ id: "card_1", type: "card" }] },
    { type: "payment.reference", conditional_transaction_id: "digest-1" },
    { type: "payment.amount_range", currency: "USD", max: 100, min: 0 },
    { type: "payment.agent_recurrence", frequency: "MONTHLY" },
    { type: "payment.execution_date", not_before: "2026-01-01" },
    {
      type: "payment.allowed_pisps",
      allowed: [{ legal_name: "Acme PISP", brand_name: "Acme", domain_name: "acme.example" }],
    },
  ])("accepts a well-formed $type constraint", (constraint) => {
    expect(validatePaymentConstraints([constraint])).toBe(true);
  });

  it("rejects a payment.budget constraint missing 'currency'", () => {
    const valid = validatePaymentConstraints([{ type: "payment.budget", max: 100 }]);
    expect(valid).toBe(false);
  });

  it("rejects a payment constraint with an unrecognized type", () => {
    const valid = validatePaymentConstraints([{ type: "payment.not_a_real_type", foo: "bar" }]);
    expect(valid).toBe(false);
  });
});

describe("unit: AP2 constraint assembly (Option B named parameters)", () => {
  const merchant = { id: "merchant_1", name: "Demo Merchant", website: "https://demo-merchant.example" };
  const instrument = { id: "card_1", type: "card", description: "Card ****4242" };

  it("assembles checkout lineItems/allowedMerchants into the same shape as hand-built constraints", () => {
    const assembled = assembleCheckoutConstraints({
      keyId: "key-1",
      publicJwk: { kty: "EC", crv: "P-256", x: "x", y: "y" },
      lineItems: [{ id: "line_1", quantity: 2, acceptableItems: [{ id: "SKU-1", title: "Widget" }] }],
      allowedMerchants: [merchant],
    });

    expect(assembled).toEqual([
      {
        type: "checkout.line_items",
        items: [{ id: "line_1", quantity: 2, acceptable_items: [{ id: "SKU-1", title: "Widget" }] }],
      },
      { type: "checkout.allowed_merchants", allowed: [merchant] },
    ]);
  });

  it("merges raw constraints, named fields, and additionalConstraints in order", () => {
    const assembled = assembleCheckoutConstraints({
      keyId: "key-1",
      publicJwk: { kty: "EC", crv: "P-256", x: "x", y: "y" },
      constraints: [{ type: "checkout.custom_raw", foo: "bar" }],
      allowedMerchants: [merchant],
      additionalConstraints: [{ type: "checkout.another_raw", baz: "qux" }],
    });

    expect(assembled).toEqual([
      { type: "checkout.custom_raw", foo: "bar" },
      { type: "checkout.allowed_merchants", allowed: [merchant] },
      { type: "checkout.another_raw", baz: "qux" },
    ]);
  });

  it("assembles all payment named fields into the same shape as hand-built constraints", () => {
    const assembled = assemblePaymentConstraints({
      keyId: "key-1",
      publicJwk: { kty: "EC", crv: "P-256", x: "x", y: "y" },
      reference: { conditionalTransactionId: "digest-1" },
      budget: { max: 100, currency: "USD" },
      allowedPayees: [merchant],
      allowedPaymentInstruments: [instrument],
      amountRange: { max: 100, min: 10, currency: "USD" },
      agentRecurrence: { frequency: "MONTHLY", maxOccurrences: 3 },
      executionDate: { notBefore: "2026-01-01", notAfter: "2026-12-31" },
    });

    expect(assembled).toEqual([
      { type: "payment.budget", max: 100, currency: "USD" },
      { type: "payment.allowed_payees", allowed: [merchant] },
      { type: "payment.allowed_payment_instruments", allowed: [instrument] },
      { type: "payment.reference", conditional_transaction_id: "digest-1" },
      { type: "payment.amount_range", currency: "USD", max: 100, min: 10 },
      { type: "payment.agent_recurrence", frequency: "MONTHLY", max_occurrences: 3 },
      { type: "payment.execution_date", not_before: "2026-01-01", not_after: "2026-12-31" },
    ]);
  });

  it("omits fields that weren't provided rather than emitting them as undefined", () => {
    const assembled = assemblePaymentConstraints({
      keyId: "key-1",
      publicJwk: { kty: "EC", crv: "P-256", x: "x", y: "y" },
      reference: { conditionalTransactionId: "digest-1" },
      amountRange: { max: 100, currency: "USD" },
      agentRecurrence: { frequency: "ON_DEMAND" },
      executionDate: {},
    });

    expect(assembled).toEqual([
      { type: "payment.reference", conditional_transaction_id: "digest-1" },
      { type: "payment.amount_range", currency: "USD", max: 100 },
      { type: "payment.agent_recurrence", frequency: "ON_DEMAND" },
      { type: "payment.execution_date" },
    ]);
  });

  it("still accepts a purely raw constraints array with no named fields (no regression)", () => {
    const rawConstraints = [
      { type: "payment.allowed_payees", allowed: [merchant] },
      { type: "payment.reference", conditional_transaction_id: "digest-1" },
    ];

    const assembled = assemblePaymentConstraints({
      keyId: "key-1",
      publicJwk: { kty: "EC", crv: "P-256", x: "x", y: "y" },
      constraints: rawConstraints,
    });

    expect(assembled).toEqual(rawConstraints);
  });
});

describe("unit: AP2 mandate schemas' anyOf 'at least one' requirement", () => {
  const validateOpenCheckout = ajv.compile(issueOpenCheckoutMandateSchema);
  const validateOpenPayment = ajv.compile(issueOpenPaymentMandateSchema);
  const publicJwk = { kty: "EC", crv: "P-256", x: "x", y: "y" };

  it("rejects issue_open_checkout_mandate args with keyId/publicJwk but no lineItems/constraints/additionalConstraints", () => {
    expect(validateOpenCheckout({ keyId: "key-1", publicJwk })).toBe(false);
  });

  const rawLineItemsConstraint = {
    type: "checkout.line_items",
    items: [{ id: "line_1", quantity: 1, acceptable_items: [{ id: "SKU-1", title: "Widget" }] }],
  };

  it.each([
    { lineItems: [{ id: "line_1", quantity: 1, acceptableItems: [{ id: "SKU-1", title: "Widget" }] }] },
    { constraints: [rawLineItemsConstraint] },
    { additionalConstraints: [rawLineItemsConstraint] },
  ])("accepts issue_open_checkout_mandate args satisfying anyOf via %j", (extra) => {
    expect(validateOpenCheckout({ keyId: "key-1", publicJwk, ...extra })).toBe(true);
  });

  it("rejects issue_open_payment_mandate args with keyId/publicJwk but no reference/constraints/additionalConstraints", () => {
    expect(validateOpenPayment({ keyId: "key-1", publicJwk })).toBe(false);
  });

  it.each([
    { reference: { conditionalTransactionId: "digest-1" } },
    { constraints: [{ type: "payment.reference", conditional_transaction_id: "digest-1" }] },
    { additionalConstraints: [{ type: "payment.reference", conditional_transaction_id: "digest-1" }] },
  ])("accepts issue_open_payment_mandate args satisfying anyOf via %j", (extra) => {
    expect(validateOpenPayment({ keyId: "key-1", publicJwk, ...extra })).toBe(true);
  });

  it("validates the schemas' own worked examples", () => {
    for (const example of (issueOpenCheckoutMandateSchema as { examples: unknown[] }).examples) {
      expect(validateOpenCheckout(example)).toBe(true);
    }
    for (const example of (issueOpenPaymentMandateSchema as { examples: unknown[] }).examples) {
      expect(validateOpenPayment(example)).toBe(true);
    }
  });
});
