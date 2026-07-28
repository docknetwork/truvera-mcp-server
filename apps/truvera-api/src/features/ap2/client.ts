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
import type {
  VerifyPaymentMandateRequest,
  VerifyPaymentMandateResult,
  IssuePaymentTokenRequest,
  IssuePaymentTokenResult,
  PaymentReceiptContent,
} from "./types.js";

export class AP2Client {
  async verifyPaymentMandate(params: VerifyPaymentMandateRequest): Promise<VerifyPaymentMandateResult> {
    const paymentResult = verifyClosedPaymentMandate(params.closedPaymentMandatePresentation, {
      holderJwk: params.holderJwk,
      checkoutJwt: params.checkoutJwt,
      openMandatePresentation: params.openPaymentMandatePresentation,
    });

    const result: VerifyPaymentMandateResult = {
      paymentMandateVerified: paymentResult.verified,
      ...(paymentResult.verified
        ? {
            transactionIdVerified: paymentResult.transactionIdVerified,
            sdHashVerified: paymentResult.sdHashVerified,
            paymentMandateContent: paymentResult.content as Record<string, unknown> | undefined,
          }
        : { paymentMandateError: paymentResult.error?.message }),
    };

    if (params.closedCheckoutMandatePresentation) {
      const checkoutResult = verifyClosedCheckoutMandate(params.closedCheckoutMandatePresentation, {
        holderJwk: params.holderJwk,
        openMandatePresentation: params.openCheckoutMandatePresentation,
      });
      result.checkoutMandateVerified = checkoutResult.verified;
      if (checkoutResult.verified) {
        result.checkoutMandateContent = checkoutResult.content as Record<string, unknown> | undefined;
      } else {
        result.checkoutMandateError = checkoutResult.error?.message;
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
