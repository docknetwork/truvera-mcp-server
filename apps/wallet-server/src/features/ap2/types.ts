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

export interface IssueOpenCheckoutMandateRequest {
  /** id of a key created via create_ap2_signing_key. */
  keyId: string;
  /** The cnf holder key — the public JWK returned by create_ap2_signing_key. */
  publicJwk: P256Jwk;
  constraints: MandateConstraint[];
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

export interface IssueOpenPaymentMandateRequest {
  keyId: string;
  publicJwk: P256Jwk;
  constraints: MandateConstraint[];
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
