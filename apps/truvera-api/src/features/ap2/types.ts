/**
 * AP2 (Agent Payments Protocol) v0.2 types — Credential Provider role.
 * Based on https://ap2-protocol.org/ap2/specification/
 *
 * Mandates (Open/Closed Checkout and Payment) are self-signed by the wallet
 * (user_sk) and Shopping Agent (agent_sk) — see wallet-server's ap2 feature.
 * truvera-api's role here is the spec's Credential Provider: verify a Closed
 * Payment Mandate and return a Payment Receipt.
 */

export interface P256Jwk {
  kty: string;
  crv: string;
  x: string;
  y: string;
}

export interface VerifyPaymentMandateRequest {
  /** Compact presentation returned by wallet-server's issue_closed_payment_mandate. */
  closedPaymentMandatePresentation: string;
  /** The Shopping Agent's public key (from the Open Payment Mandate's cnf.jwk). */
  holderJwk: P256Jwk;
  /** The merchant-signed Checkout JWT, to verify transaction_id against. */
  checkoutJwt?: string;
  /** Compact presentation returned by issue_open_payment_mandate, to verify sd_hash against. */
  openPaymentMandatePresentation?: string;
  /**
   * Optional: also verify the paired Closed Checkout Mandate, since
   * transaction_id binds to it. Compact presentation returned by
   * issue_closed_checkout_mandate.
   */
  closedCheckoutMandatePresentation?: string;
  /** Compact presentation returned by issue_open_checkout_mandate, if verifying the checkout mandate too. */
  openCheckoutMandatePresentation?: string;
}

export interface VerifyPaymentMandateResult {
  paymentMandateVerified: boolean;
  paymentMandateError?: string;
  transactionIdVerified?: boolean;
  sdHashVerified?: boolean;
  checkoutMandateVerified?: boolean;
  checkoutMandateError?: string;
  paymentMandateContent?: Record<string, unknown>;
  checkoutMandateContent?: Record<string, unknown>;
}

export interface IssuePaymentTokenRequest extends VerifyPaymentMandateRequest {
  /** iss claim for the resulting Payment Receipt (e.g. a Truvera-assigned processor id). */
  issuer: string;
  paymentId: string;
  pspConfirmationId?: string;
  networkConfirmationId?: string;
}

export interface PaymentReceiptContent {
  status: "Success" | "Error";
  iss: string;
  iat: number;
  reference: string;
  payment_id?: string;
  psp_confirmation_id?: string;
  network_confirmation_id?: string;
  error?: string;
  error_description?: string;
}

export interface IssuePaymentTokenResult {
  verification: VerifyPaymentMandateResult;
  receipt?: PaymentReceiptContent;
  /**
   * Whether `receipt` is cryptographically signed. Signing requires a
   * Truvera-managed processor key exposed as a raw-signing capability, which
   * is not yet wired up here — see the ap2 feature README. The unsigned
   * receipt content is still returned so callers have the correct shape to
   * act on once real signing is available.
   */
  signed: boolean;
}
