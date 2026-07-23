/**
 * AP2 Client
 * Issues AP2 v0.2 mandates (Open/Closed Checkout and Payment) using a
 * wallet-held secp256r1 signing key. Mandates are self-signed per the AP2
 * spec — this client never sends key material out of the wallet; signing is
 * bridged through IDIDProvider.signWithKeyId.
 */

import * as bs58 from "base58-universal";
import { secp256r1PublicKeyToJwk } from "@docknetwork/crypto-utils/vc";
import {
  buildOpenCheckoutMandate,
  signOpenCheckoutMandate,
  buildClosedCheckoutMandate,
  signClosedCheckoutMandate,
  buildOpenPaymentMandate,
  signOpenPaymentMandate,
  buildClosedPaymentMandate,
  signClosedPaymentMandate,
  computeCheckoutHash,
  resolveOpenPaymentMandateContent,
  verifyClosedPaymentMandate,
} from "@docknetwork/ap2";
import type { IDIDProvider } from "@docknetwork/wallet-sdk-core/lib/types.js";
import type {
  CreateAP2SigningKeyRequest,
  CreateAP2SigningKeyResult,
  IssueOpenCheckoutMandateRequest,
  IssueOpenCheckoutMandateResult,
  IssueClosedCheckoutMandateRequest,
  IssueClosedCheckoutMandateResult,
  IssueOpenPaymentMandateRequest,
  IssueOpenPaymentMandateResult,
  IssueClosedPaymentMandateRequest,
  IssueClosedPaymentMandateResult,
} from "./types.js";

const VCT_CHECKOUT_OPEN = "mandate.checkout.open.1";
const VCT_CHECKOUT_CLOSED = "mandate.checkout.1";
const VCT_PAYMENT_OPEN = "mandate.payment.open.1";
const VCT_PAYMENT_CLOSED = "mandate.payment.1";

type OpenPaymentMandateConstraint = { type: string; [key: string]: unknown };

function findConstraint(constraints: OpenPaymentMandateConstraint[], type: string) {
  return constraints.find((c) => c.type === type);
}

// Enforces the Open Payment Mandate's own declared constraints against a
// Closed Payment Mandate about to be signed for it. Each constraint type is
// optional per the AP2 schema (only payment.reference is required) -- an
// Open Mandate that doesn't declare a given constraint imposes no limit of
// that kind, which is a protocol-level modeling choice, not a gap here.
function enforceOpenPaymentMandateConstraints(
  constraints: OpenPaymentMandateConstraint[],
  params: Pick<IssueClosedPaymentMandateRequest, "paymentAmount" | "payee" | "paymentInstrument">
) {
  const budget = findConstraint(constraints, "payment.budget") as { max: number; currency: string } | undefined;
  if (budget && (params.paymentAmount.amount > budget.max || params.paymentAmount.currency !== budget.currency)) {
    throw new Error(
      `paymentAmount (${params.paymentAmount.amount} ${params.paymentAmount.currency}) exceeds the Open Payment Mandate's payment.budget constraint (${budget.max} ${budget.currency})`
    );
  }

  const amountRange = findConstraint(constraints, "payment.amount_range") as
    | { max: number; min?: number; currency: string }
    | undefined;
  if (amountRange) {
    if (params.paymentAmount.currency !== amountRange.currency) {
      throw new Error(
        `paymentAmount currency "${params.paymentAmount.currency}" does not match the Open Payment Mandate's payment.amount_range currency (${amountRange.currency})`
      );
    }
    if (
      params.paymentAmount.amount > amountRange.max ||
      (amountRange.min !== undefined && params.paymentAmount.amount < amountRange.min)
    ) {
      throw new Error(
        `paymentAmount (${params.paymentAmount.amount} ${params.paymentAmount.currency}) is outside the Open Payment Mandate's payment.amount_range constraint (${amountRange.min ?? 0}-${amountRange.max} ${amountRange.currency})`
      );
    }
  }

  const allowedPayees = findConstraint(constraints, "payment.allowed_payees") as
    | { allowed: Array<{ id: string }> }
    | undefined;
  if (allowedPayees && !allowedPayees.allowed.some((p) => p.id === params.payee.id)) {
    throw new Error(`payee "${params.payee.id}" is not in the Open Payment Mandate's payment.allowed_payees`);
  }

  const allowedInstruments = findConstraint(constraints, "payment.allowed_payment_instruments") as
    | { allowed: Array<{ id: string }> }
    | undefined;
  if (allowedInstruments && !allowedInstruments.allowed.some((i) => i.id === params.paymentInstrument.id)) {
    throw new Error(
      `paymentInstrument "${params.paymentInstrument.id}" is not in the Open Payment Mandate's payment.allowed_payment_instruments`
    );
  }
}

export class AP2Client {
  private didProvider: IDIDProvider;

  constructor(didProvider: IDIDProvider) {
    this.didProvider = didProvider;
  }

  private createSigner(keyId: string) {
    return {
      sign: (data: Uint8Array) => this.didProvider.signWithKeyId({ keyId, data }),
    };
  }

  async createSigningKey(params: CreateAP2SigningKeyRequest): Promise<CreateAP2SigningKeyResult> {
    const keyDoc = await this.didProvider.createSigningKey({ controller: params.controller });
    const publicKeyBytes = bs58.decode(keyDoc.publicKeyBase58);
    const publicJwk = secp256r1PublicKeyToJwk(publicKeyBytes);
    return { keyId: keyDoc.id, publicJwk };
  }

  async issueOpenCheckoutMandate(params: IssueOpenCheckoutMandateRequest): Promise<IssueOpenCheckoutMandateResult> {
    const content = buildOpenCheckoutMandate({
      vct: VCT_CHECKOUT_OPEN,
      constraints: params.constraints,
      cnf: { jwk: params.publicJwk },
      ...(params.exp !== undefined ? { iat: Math.floor(Date.now() / 1000), exp: params.exp } : {}),
    });
    const presentation = await signOpenCheckoutMandate(content, {
      signer: this.createSigner(params.keyId),
    });
    return { presentation };
  }

  async issueClosedCheckoutMandate(params: IssueClosedCheckoutMandateRequest): Promise<IssueClosedCheckoutMandateResult> {
    const checkoutHash = computeCheckoutHash(params.checkoutJwt);
    const content = buildClosedCheckoutMandate({
      vct: VCT_CHECKOUT_CLOSED,
      checkout_jwt: params.checkoutJwt,
      checkout_hash: checkoutHash,
    });
    const presentation = await signClosedCheckoutMandate(content, {
      signer: this.createSigner(params.keyId),
      nonce: params.nonce,
      openMandatePresentation: params.openMandatePresentation,
    });
    return { presentation, checkoutHash };
  }

  async issueOpenPaymentMandate(params: IssueOpenPaymentMandateRequest): Promise<IssueOpenPaymentMandateResult> {
    const content = buildOpenPaymentMandate({
      vct: VCT_PAYMENT_OPEN,
      constraints: params.constraints,
      cnf: { jwk: params.publicJwk },
      ...(params.exp !== undefined ? { iat: Math.floor(Date.now() / 1000), exp: params.exp } : {}),
    });
    const presentation = await signOpenPaymentMandate(content, {
      signer: this.createSigner(params.keyId),
    });
    return { presentation };
  }

  async issueClosedPaymentMandate(params: IssueClosedPaymentMandateRequest): Promise<IssueClosedPaymentMandateResult> {
    const { content: openContent } = resolveOpenPaymentMandateContent(params.openMandatePresentation);
    enforceOpenPaymentMandateConstraints(openContent.constraints, params);

    const transactionId = computeCheckoutHash(params.checkoutJwt);
    const content = buildClosedPaymentMandate({
      vct: VCT_PAYMENT_CLOSED,
      transaction_id: transactionId,
      payee: params.payee,
      payment_amount: params.paymentAmount,
      payment_instrument: params.paymentInstrument,
    });
    const presentation = await signClosedPaymentMandate(content, {
      signer: this.createSigner(params.keyId),
      nonce: params.nonce,
      openMandatePresentation: params.openMandatePresentation,
    });

    // Confirms the key that actually signed this Closed Payment Mandate
    // (params.keyId, resolved through IDIDProvider) is the one the Open
    // Payment Mandate itself endorsed as its closer (cnf.jwk) -- otherwise a
    // presentation meant for one holder key could be closed with a
    // different, unauthorized one. Does not (and cannot, without an
    // independently-known issuer key) verify who originally issued the Open
    // Payment Mandate; see resolveOpenPaymentMandateContent's doc comment.
    const verification = verifyClosedPaymentMandate(presentation, {
      holderJwk: openContent.cnf.jwk,
      checkoutJwt: params.checkoutJwt,
      openMandatePresentation: params.openMandatePresentation,
    });
    if (!verification.verified) {
      throw new Error(
        `issue_closed_payment_mandate: keyId does not match the Open Payment Mandate's cnf.jwk (${
          verification.error?.message ?? "verification failed"
        })`
      );
    }

    return { presentation, transactionId };
  }
}
