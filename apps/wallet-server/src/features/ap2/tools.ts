/**
 * AP2 Tools
 * MCP tool definitions and handlers for AP2 v0.2 mandate operations
 */

import type { ToolDef, ToolHandler } from "@truvera/mcp-shared/tools";
import type { AP2Client } from "./client.js";
import {
  createAP2SigningKeySchema,
  issueOpenCheckoutMandateSchema,
  issueClosedCheckoutMandateSchema,
  issueOpenPaymentMandateSchema,
  issueClosedPaymentMandateSchema,
} from "./schemas.js";
import type {
  CreateAP2SigningKeyRequest,
  IssueOpenCheckoutMandateRequest,
  IssueClosedCheckoutMandateRequest,
  IssueOpenPaymentMandateRequest,
  IssueClosedPaymentMandateRequest,
} from "./types.js";

function successResult(data: Record<string, unknown>) {
  return {
    content: [{ type: "text" as const, text: JSON.stringify({ success: true, ...data }, null, 2) }],
  };
}

function errorResult(error: unknown) {
  return {
    content: [
      {
        type: "text" as const,
        text: JSON.stringify(
          { success: false, error: error instanceof Error ? error.message : String(error) },
          null,
          2
        ),
      },
    ],
    isError: true,
  };
}

export const ap2ToolDefs: ToolDef[] = [
  {
    name: "create_ap2_signing_key",
    title: "Create AP2 Signing Key",
    description:
      "Create a P-256 (secp256r1) signing key attached to an existing DID, for use as the holder key (cnf) of AP2 v0.2 mandates. Both the user and the Shopping Agent need their own key — call this once per role and keep the returned keyId to sign with later.",
    inputSchema: createAP2SigningKeySchema,
  },
  {
    name: "issue_open_checkout_mandate",
    title: "Issue Open Checkout Mandate",
    description:
      "Sign an AP2 Open Checkout Mandate (mandate.checkout.open.1) with a wallet-held key. Captures the user's constraints (allowed merchants, line items) before a specific cart is finalized, and endorses the key (cnf) that will later be used to close it — typically the Shopping Agent's key for human-not-present flows.",
    inputSchema: issueOpenCheckoutMandateSchema,
  },
  {
    name: "issue_closed_checkout_mandate",
    title: "Issue Closed Checkout Mandate",
    description:
      "Sign an AP2 Closed Checkout Mandate (mandate.checkout.1), binding a merchant-signed Checkout JWT to a previously-issued Open Checkout Mandate. Signed by the Shopping Agent's key (the one endorsed in the Open Mandate's cnf) for autonomous/human-not-present authorization.",
    inputSchema: issueClosedCheckoutMandateSchema,
  },
  {
    name: "issue_open_payment_mandate",
    title: "Issue Open Payment Mandate",
    description:
      "Sign an AP2 Open Payment Mandate (mandate.payment.open.1) with a wallet-held key. Captures the user's payment constraints (budget, allowed payees) and endorses the key that will later close it.",
    inputSchema: issueOpenPaymentMandateSchema,
  },
  {
    name: "issue_closed_payment_mandate",
    title: "Issue Closed Payment Mandate",
    description:
      "Sign an AP2 Closed Payment Mandate (mandate.payment.1), binding payment details to a specific Checkout via transaction_id (computed from checkout_jwt) and to a previously-issued Open Payment Mandate via sd_hash. Signed by the Shopping Agent's key.",
    inputSchema: issueClosedPaymentMandateSchema,
  },
];

export function getAP2Handlers(client: AP2Client): Map<string, ToolHandler> {
  const handlers = new Map<string, ToolHandler>();

  handlers.set("create_ap2_signing_key", async (args: unknown) => {
    try {
      const params = args as CreateAP2SigningKeyRequest;
      const result = await client.createSigningKey(params);
      return successResult({ keyId: result.keyId, publicJwk: result.publicJwk });
    } catch (error) {
      return errorResult(error);
    }
  });

  handlers.set("issue_open_checkout_mandate", async (args: unknown) => {
    try {
      const params = args as IssueOpenCheckoutMandateRequest;
      const result = await client.issueOpenCheckoutMandate(params);
      return successResult({ presentation: result.presentation });
    } catch (error) {
      return errorResult(error);
    }
  });

  handlers.set("issue_closed_checkout_mandate", async (args: unknown) => {
    try {
      const params = args as IssueClosedCheckoutMandateRequest;
      const result = await client.issueClosedCheckoutMandate(params);
      return successResult({ presentation: result.presentation, checkoutHash: result.checkoutHash });
    } catch (error) {
      return errorResult(error);
    }
  });

  handlers.set("issue_open_payment_mandate", async (args: unknown) => {
    try {
      const params = args as IssueOpenPaymentMandateRequest;
      const result = await client.issueOpenPaymentMandate(params);
      return successResult({ presentation: result.presentation });
    } catch (error) {
      return errorResult(error);
    }
  });

  handlers.set("issue_closed_payment_mandate", async (args: unknown) => {
    try {
      const params = args as IssueClosedPaymentMandateRequest;
      const result = await client.issueClosedPaymentMandate(params);
      return successResult({ presentation: result.presentation, transactionId: result.transactionId });
    } catch (error) {
      return errorResult(error);
    }
  });

  return handlers;
}
