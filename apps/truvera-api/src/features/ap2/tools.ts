/**
 * AP2 MCP Tools — Credential Provider role
 * Tool definitions and handlers for verifying AP2 v0.2 mandates and issuing
 * Payment Receipts.
 */

import type { ToolDef, ToolHandler } from "@truvera/mcp-shared/tools";
import type { AP2Client } from "./client.js";
import type { VerifyPaymentMandateRequest, IssuePaymentTokenRequest } from "./types.js";
import { formatResult } from "../../tools/utils.js";
import { verifyPaymentMandateSchema, issuePaymentTokenSchema } from "./schemas.js";

export const ap2ToolDefs: ToolDef[] = [
  {
    name: "verify_payment_mandate",
    description:
      "Verify a Closed Payment Mandate (mandate.payment.1) as the AP2 Credential Provider: checks the Open Payment Mandate's issuer signature against the supplied userJwk, the Shopping Agent's cnf.jwk signature on the Closed Mandate, aud/expiry/nonce, transaction_id against a provided checkout_jwt, sd_hash against the referenced Open Payment Mandate, and (when openCheckoutMandatePresentation is supplied) the payment.reference binding against it. Optionally also verifies the paired Closed Checkout Mandate.",
    inputSchema: verifyPaymentMandateSchema,
  },
  {
    name: "issue_payment_token",
    description:
      "Verify a Closed Payment Mandate and, on success, return an AP2 Payment Receipt (status, iss, iat, reference, payment_id, psp/network confirmation ids). The receipt is not yet cryptographically signed — see the result's 'signed' field — pending a Truvera-managed processor signing key.",
    inputSchema: issuePaymentTokenSchema,
  },
];

export function getAP2Handlers(client: AP2Client): Map<string, ToolHandler> {
  const handlers = new Map<string, ToolHandler>();

  handlers.set("verify_payment_mandate", async (args) => {
    const request = args as VerifyPaymentMandateRequest;
    const result = await client.verifyPaymentMandate(request);
    return formatResult({ success: true, data: result });
  });

  handlers.set("issue_payment_token", async (args) => {
    const request = args as IssuePaymentTokenRequest;
    const result = await client.issuePaymentToken(request);
    return formatResult({ success: true, data: result });
  });

  return handlers;
}
