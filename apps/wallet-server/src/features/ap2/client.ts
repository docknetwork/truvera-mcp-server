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
    return { presentation, transactionId };
  }
}
