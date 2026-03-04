/**
 * AP2 MCP Tools
 * Tool definitions and handlers for AP2 mandate operations
 */

import type { ToolDef, ToolHandler } from "@truvera/mcp-shared/tools";
import type { AP2Client } from "./client.js";
import type {
  IssueCartMandateRequest,
  IssueIntentMandateRequest,
  IssuePaymentMandateRequest,
} from "./client.js";
import { formatResult } from "../../tools/utils.js";
import { components, getSchemaWithContext } from "./schemas.js";

/**
 * Get tool definitions with schema URL context
 */
export function getAP2ToolDefs(): ToolDef[] {
  const { schemaUrls } = getSchemaWithContext("IssueCartMandateRequest");
  
  return [
    {
      name: "issue_cart_mandate",
      description: `Issue a Cart Mandate for human-present payment authorization. Cart Mandates contain exact cart details that the user explicitly approves with cryptographic signature. Schema: ${schemaUrls.cart}. This mandate is signed by the merchant first, then by the user's device. Required for human-present transactions where the user sees and approves the final cart.`,
      inputSchema: components.schemas.IssueCartMandateRequest,
    },
    {
      name: "issue_intent_mandate",
      description: `Issue an Intent Mandate for human-not-present payment authorization. Intent Mandates contain shopping constraints (budget, products, merchant preferences) that authorize an agent to make purchases on the user's behalf within defined limits. Schema: ${schemaUrls.intent}. The user signs this mandate to pre-authorize purchases that may happen later when they're not present. Use for scenarios like "buy these shoes when the price drops below $100" or "buy concert tickets as soon as they go on sale".`,
      inputSchema: components.schemas.IssueIntentMandateRequest,
    },
    {
      name: "issue_payment_mandate",
      description: `Issue a Payment Mandate for payment network visibility into agent involvement. Payment Mandates are separate VDCs sent to payment networks and issuers (alongside cart/intent mandates) to signal AI agent participation and transaction modality. Schema: ${schemaUrls.payment}. This helps networks assess risk and ensure proper accountability for agentic transactions.`,
      inputSchema: components.schemas.IssuePaymentMandateRequest,
    },
    {
      name: "verify_mandate",
      description: "Verify an AP2 mandate credential using the Truvera API. Validates signatures, checks expiration, and confirms the mandate's authenticity. Returns verification status and details about the mandate.",
      inputSchema: components.schemas.VerifyMandateRequest,
    },
  ];
}

/**
 * Get tool handlers for AP2 operations
 */
export function getAP2Handlers(client: AP2Client): Map<string, ToolHandler> {
  const handlers = new Map<string, ToolHandler>();

  handlers.set("issue_cart_mandate", async (args) => {
    const request = args as IssueCartMandateRequest;
    return formatResult(await client.issueCartMandate(request));
  });

  handlers.set("issue_intent_mandate", async (args) => {
    const request = args as IssueIntentMandateRequest;
    return formatResult(await client.issueIntentMandate(request));
  });

  handlers.set("issue_payment_mandate", async (args) => {
    const request = args as IssuePaymentMandateRequest;
    return formatResult(await client.issuePaymentMandate(request));
  });

  handlers.set("verify_mandate", async (args) => {
    const { credential_id } = args as { credential_id: string };
    if (!credential_id) {
      return {
        content: [{ type: "text", text: "Error: 'credential_id' is required" }],
        isError: true,
      };
    }
    return formatResult(await client.verifyMandate(credential_id));
  });

  return handlers;
}
