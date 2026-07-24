/**
 * AP2 (Agent Payments Protocol) v0.2 mandate types
 */

export interface P256Jwk {
  kty: string;
  crv: string;
  x: string;
  y: string;
}

export interface CreateAP2SigningKeyRequest {
  /** DID this signing key is attached to (must already exist in the wallet). */
  controller: string;
}

export interface CreateAP2SigningKeyResult {
  keyId: string;
  publicJwk: P256Jwk;
}

export interface MandateConstraint {
  type: string;
  [key: string]: unknown;
}

export interface CheckoutLineItem {
  id: string;
  quantity: number;
  acceptableItems: Array<{ id: string; title: string }>;
}

export interface AllowedMerchant {
  id: string;
  name: string;
  website?: string;
}

export interface IssueOpenCheckoutMandateRequest {
  /** id of a key created via create_ap2_signing_key. */
  keyId: string;
  /** The cnf holder key — the public JWK returned by create_ap2_signing_key. */
  publicJwk: P256Jwk;
  /** Raw AP2 constraint objects — escape hatch for constraint types not covered below. Merged with any constraints assembled from the named fields. */
  constraints?: MandateConstraint[];
  /** Assembled into a checkout.line_items constraint. At least one entry is required by the mandate schema (via constraints or additionalConstraints, if not here). */
  lineItems?: CheckoutLineItem[];
  /** Assembled into a checkout.allowed_merchants constraint. */
  allowedMerchants?: AllowedMerchant[];
  /** Raw constraint objects for types not covered by lineItems/allowedMerchants, merged in as-is. */
  additionalConstraints?: MandateConstraint[];
  /** Unix epoch seconds. iat defaults to now when exp is set. */
  exp?: number;
}

export interface IssueOpenCheckoutMandateResult {
  presentation: string;
}

export interface IssueClosedCheckoutMandateRequest {
  /** id of the Shopping Agent's signing key. */
  keyId: string;
  /** The merchant-signed Checkout JWT. */
  checkoutJwt: string;
  nonce: string;
  /** The compact presentation returned by issue_open_checkout_mandate. */
  openMandatePresentation: string;
}

export interface IssueClosedCheckoutMandateResult {
  presentation: string;
  checkoutHash: string;
}

export interface PaymentAllowedPayee {
  id: string;
  name: string;
  website?: string;
}

export interface PaymentAllowedInstrument {
  id: string;
  type: string;
  description?: string;
}

export interface PaymentReference {
  conditionalTransactionId: string;
}

export interface PaymentBudget {
  max: number;
  currency: string;
}

export interface PaymentAmountRange {
  max: number;
  min?: number;
  currency: string;
}

export interface PaymentAgentRecurrence {
  frequency: "ON_DEMAND" | "DAILY" | "WEEKLY" | "BIWEEKLY" | "MONTHLY" | "QUARTERLY" | "ANNUALLY";
  maxOccurrences?: number;
}

export interface PaymentExecutionDate {
  notBefore?: string;
  notAfter?: string;
}

export interface IssueOpenPaymentMandateRequest {
  keyId: string;
  publicJwk: P256Jwk;
  /** Raw AP2 constraint objects — escape hatch for constraint types not covered below. Merged with any constraints assembled from the named fields. */
  constraints?: MandateConstraint[];
  /** Assembled into a payment.reference constraint. Required by the mandate schema (via constraints or additionalConstraints, if not here). */
  reference?: PaymentReference;
  /** Assembled into a payment.budget constraint. */
  budget?: PaymentBudget;
  /** Assembled into a payment.allowed_payees constraint. */
  allowedPayees?: PaymentAllowedPayee[];
  /** Assembled into a payment.allowed_payment_instruments constraint. */
  allowedPaymentInstruments?: PaymentAllowedInstrument[];
  /** Assembled into a payment.amount_range constraint. */
  amountRange?: PaymentAmountRange;
  /** Assembled into a payment.agent_recurrence constraint. */
  agentRecurrence?: PaymentAgentRecurrence;
  /** Assembled into a payment.execution_date constraint. */
  executionDate?: PaymentExecutionDate;
  /** Raw constraint objects for types not covered above (e.g. payment.allowed_pisps), merged in as-is. */
  additionalConstraints?: MandateConstraint[];
  exp?: number;
}

export interface IssueOpenPaymentMandateResult {
  presentation: string;
}

export interface MandateParty {
  id: string;
  name: string;
  website?: string;
}

export interface MandateAmount {
  amount: number;
  currency: string;
}

export interface PaymentInstrument {
  id: string;
  type: string;
  description?: string;
}

export interface IssueClosedPaymentMandateRequest {
  keyId: string;
  /** The same Checkout JWT bound in the corresponding Closed Checkout Mandate. */
  checkoutJwt: string;
  payee: MandateParty;
  paymentAmount: MandateAmount;
  paymentInstrument: PaymentInstrument;
  nonce: string;
  /** The compact presentation returned by issue_open_payment_mandate. */
  openMandatePresentation: string;
}

export interface IssueClosedPaymentMandateResult {
  presentation: string;
  transactionId: string;
}
