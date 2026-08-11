/**
 * AP2 Client — Credential Provider role.
 *
 * Verifies Closed Payment (and optionally Checkout) Mandates and, on
 * success, returns an AP2 Payment Receipt. Mandates themselves are issued
 * elsewhere (wallet-server's ap2 feature) since they're self-signed by the
 * user/Shopping Agent, not issued by Truvera.
 */

import {
  verifyClosedPaymentMandate,
  verifyClosedCheckoutMandate,
  buildPaymentReceipt,
  computeMandateReference,
} from "@docknetwork/ap2";
import { jwkToSecp256r1PublicKey } from "@docknetwork/crypto-utils/vc";
import type {
  VerifyPaymentMandateRequest,
  VerifyPaymentMandateResult,
  IssuePaymentTokenRequest,
  IssuePaymentTokenResult,
  PaymentReceiptContent,
} from "./types.js";

export class AP2Client {
  async verifyPaymentMandate(params: VerifyPaymentMandateRequest): Promise<VerifyPaymentMandateResult> {
    // @docknetwork/ap2 requires this to verify the Open Mandate's own issuer
    // signature -- without it, a Closed Mandate's cnf.jwk delegation could be
    // trusted from an entirely self-forged Open + Closed Mandate chain. It's
    // the User's own key, independently resolved/trusted by this caller (see
    // userJwk's doc comment on VerifyPaymentMandateRequest).
    const userPublicKey = jwkToSecp256r1PublicKey(params.userJwk);

    const paymentResult = verifyClosedPaymentMandate(params.closedPaymentMandatePresentation, {
      userPublicKey,
      expectedNonce: params.paymentExpectedNonce,
      checkoutJwt: params.checkoutJwt,
      openMandatePresentation: params.openPaymentMandatePresentation,
      openCheckoutMandatePresentation: params.openCheckoutMandatePresentation,
    });

    const result: VerifyPaymentMandateResult = {
      paymentMandateVerified: paymentResult.verified,
      ...(paymentResult.verified
        ? {
            transactionIdVerified: paymentResult.transactionIdVerified,
            sdHashVerified: paymentResult.sdHashVerified,
            referenceVerified: paymentResult.referenceVerified,
            openMandateIssuerVerified: paymentResult.openMandateIssuerVerified,
            paymentMandateContent: paymentResult.content as Record<string, unknown> | undefined,
          }
        : { paymentMandateError: paymentResult.error?.message }),
    };

    if (params.closedCheckoutMandatePresentation) {
      if (!params.openCheckoutMandatePresentation || !params.checkoutExpectedNonce) {
        result.checkoutMandateVerified = false;
        result.checkoutMandateError =
          "closedCheckoutMandatePresentation requires openCheckoutMandatePresentation and checkoutExpectedNonce";
      } else {
        const checkoutResult = verifyClosedCheckoutMandate(params.closedCheckoutMandatePresentation, {
          userPublicKey,
          expectedNonce: params.checkoutExpectedNonce,
          openMandatePresentation: params.openCheckoutMandatePresentation,
        });
        result.checkoutMandateVerified = checkoutResult.verified;
        if (checkoutResult.verified) {
          result.checkoutMandateContent = checkoutResult.content as Record<string, unknown> | undefined;
        } else {
          result.checkoutMandateError = checkoutResult.error?.message;
        }
      }
    }

    return result;
  }

  async issuePaymentToken(params: IssuePaymentTokenRequest): Promise<IssuePaymentTokenResult> {
    const verification = await this.verifyPaymentMandate(params);

    if (!verification.paymentMandateVerified) {
      return { verification, signed: false };
    }
    if (params.closedCheckoutMandatePresentation && !verification.checkoutMandateVerified) {
      return { verification, signed: false };
    }
    // A "Success" receipt asserts full verification, not merely a valid
    // signature -- so transaction_id/reference bindings must have actually
    // been checked (and passed), not just left undefined because the caller
    // omitted checkoutJwt/openCheckoutMandatePresentation.
    if (
      verification.transactionIdVerified !== true ||
      verification.sdHashVerified !== true ||
      verification.referenceVerified !== true
    ) {
      if (!verification.checkoutMandateError) {
        verification.checkoutMandateError =
          "No receipt issued: a Payment Receipt requires transactionIdVerified, sdHashVerified, and " +
          "referenceVerified to all be true, which requires checkoutJwt and openCheckoutMandatePresentation " +
          "to be supplied.";
      }
      return { verification, signed: false };
    }

    const receipt = buildPaymentReceipt({
      status: "Success",
      iss: params.issuer,
      iat: Math.floor(Date.now() / 1000),
      reference: computeMandateReference(params.closedPaymentMandatePresentation),
      payment_id: params.paymentId,
      ...(params.pspConfirmationId ? { psp_confirmation_id: params.pspConfirmationId } : {}),
      ...(params.networkConfirmationId ? { network_confirmation_id: params.networkConfirmationId } : {}),
    });

    // NOTE: not yet cryptographically signed — see IssuePaymentTokenResult.signed.
    return { verification, receipt: receipt as unknown as PaymentReceiptContent, signed: false };
  }
}
