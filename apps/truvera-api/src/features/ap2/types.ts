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
  /**
   * The User's own public key -- the key that signed the Open Payment (and,
   * if supplied, Open Checkout) Mandate -- independently resolved/trusted by
   * this caller (e.g. via DID resolution or a wallet registry), NOT read out
   * of the mandate presentations themselves. @docknetwork/ap2 verifies the
   * Open Mandate's issuer signature against this key before trusting its
   * cnf.jwk delegation to the Shopping Agent; without it, a Closed Mandate's
   * whole delegation chain could be self-forged.
   */
  userJwk: P256Jwk;
  /**
   * The single-use nonce this Credential Provider generated for this
   * transaction, checked against the Closed Payment Mandate's own `nonce`
   * claim. Closed Mandates carry no `exp` of their own, so without this a
   * validly-signed presentation could be replayed indefinitely.
   */
  paymentExpectedNonce: string;
  /**
   * Compact presentation returned by issue_open_payment_mandate. Required by
   * @docknetwork/ap2's verifyClosedPaymentMandate itself (to derive the
   * Shopping Agent's cnf.jwk and check sd_hash) — verification always fails
   * without it.
   */
  openPaymentMandatePresentation: string;
  /** The merchant-signed Checkout JWT, to verify transaction_id against. */
  checkoutJwt?: string;
  /**
   * Optional: also verify the paired Closed Checkout Mandate, since
   * transaction_id binds to it. Compact presentation returned by
   * issue_closed_checkout_mandate. Requires openCheckoutMandatePresentation
   * and checkoutExpectedNonce.
   */
  closedCheckoutMandatePresentation?: string;
  /**
   * Compact presentation returned by issue_open_checkout_mandate. Required if
   * closedCheckoutMandatePresentation is supplied (to verify the checkout
   * mandate); also used, together with openPaymentMandatePresentation, to
   * check the payment.reference binding.
   */
  openCheckoutMandatePresentation?: string;
  /**
   * The merchant-generated single-use nonce checked against the Closed
   * Checkout Mandate's `nonce` claim. Required if closedCheckoutMandatePresentation
   * is supplied.
   */
  checkoutExpectedNonce?: string;
}

export interface VerifyPaymentMandateResult {
  paymentMandateVerified: boolean;
  paymentMandateError?: string;
  transactionIdVerified?: boolean;
  sdHashVerified?: boolean;
  checkoutMandateVerified?: boolean;
  checkoutMandateError?: string;
  /**
   * Whether the Open Payment Mandate's payment.reference.conditional_transaction_id
   * matches a fresh sd_hash of the referenced Open Checkout Mandate presentation.
   * Computed by @docknetwork/ap2's verifyClosedPaymentMandate itself when
   * openCheckoutMandatePresentation is supplied; a mismatch fails
   * paymentMandateVerified outright rather than merely setting this to false.
   */
  referenceVerified?: boolean;
  /** Whether the Open Mandate's own issuer signature verified against userJwk. */
  openMandateIssuerVerified?: boolean;
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
