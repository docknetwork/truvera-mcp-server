/**
 * Live end-to-end test for the proof request response flow, exercised through
 * the MCP tool handler layer.
 *
 * Flow:
 * 1) Create a DID via the `create_did` tool handler
 * 2) Import a credential via the `import_credential` tool handler
 * 3) Create a proof request from the predefined template via Truvera API (direct HTTP)
 * 4) Respond to the proof request via the `respond_to_proof_request` tool handler
 *    → builds and returns a verifiable presentation
 * 5) Verify the presentation via Truvera /verify (direct HTTP)
 *    → the presentation must pass verification
 *
 * Requirements:
 *   TRUVERA_RUN_LIVE_TESTS=true
 *   TRUVERA_API_KEY=<key>
 *
 * Run via: npm run test:integration
 */

import { describe, it, expect, beforeAll, afterAll } from "@jest/globals";

import { WalletClient } from "../../../../wallet-client";
import { DIDClient } from "../../../dids/client";
import { CredentialClient } from "../../client";
import { getDIDHandlers } from "../../../dids/tools";
import { getCredentialHandlers } from "../../tools";
import { requireLiveTestEnv, TRUVERA_API_ENDPOINT, liveApiKey } from "../../../../tests/helpers/live-test-gate";

// ── Constants ────────────────────────────────────────────────────────────────

const OID4VCI_TEST_OFFER_URI =
  "openid-credential-offer://?credential_offer_uri=https://api-testnet.truvera.io/openid/credential-offers/f3a5398e-e991-4ff8-9e45-7c29873cc39b";
const PROOF_TEMPLATE_ID = "caa741b3-aa21-4bbc-b51d-e82148a7e435";

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Parse the text content from an MCP tool handler response. */
function parseToolResult(result: unknown): unknown {
  const r = result as any;
  const text = r?.content?.[0]?.text;
  if (typeof text !== "string") {
    throw new Error(`Unexpected tool result shape: ${JSON.stringify(result)}`);
  }
  return JSON.parse(text);
}

/**
 * Call the Truvera API to create a fresh proof request from the given template.
 * Returns the full proof request object (the document the wallet SDK needs to
 * feed into the verification controller).
 */
async function createProofRequestFromTemplate(templateId: string): Promise<Record<string, unknown>> {
  const response = await fetch(
    `${TRUVERA_API_ENDPOINT}/proof-templates/${encodeURIComponent(templateId)}/request`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${liveApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ name: `wallet-proof-response-e2e-${Date.now()}` }),
    }
  );

  const raw = await response.text();
  if (!response.ok) {
    throw new Error(`Failed to create proof request (${response.status}): ${raw}`);
  }

  const parsed: any = JSON.parse(raw);
  // The API may return the proof-request object directly, or nested under a key.
  const candidates: unknown[] = [parsed, parsed?.data, parsed?.proofRequest, parsed?.request];
  const proofRequest = candidates.find(
    (c) => c && typeof c === "object" && typeof (c as any).request === "object"
  ) as Record<string, unknown> | undefined;

  if (!proofRequest) {
    throw new Error(`Proof request object not found in API response: ${raw}`);
  }

  return proofRequest;
}

/**
 * Verify a presentation via Truvera /verify.
 * Tries the plain presentation first, then common wrapper shapes.
 */
async function verifyPresentation(presentation: unknown): Promise<{ verified: boolean }> {
  const payloads = [presentation, { data: presentation }];
  let lastBody = "";

  for (const payload of payloads) {
    const response = await fetch(`${TRUVERA_API_ENDPOINT}/verify`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${liveApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const raw = await response.text();
    lastBody = raw;

    if (!response.ok) continue;

    const parsed: any = JSON.parse(raw);
    const candidates: unknown[] = [parsed, parsed?.data, parsed?.result, parsed?.data?.result];
    for (const c of candidates) {
      if (c && typeof c === "object" && typeof (c as any).verified === "boolean") {
        return { verified: (c as any).verified };
      }
    }
  }

  throw new Error(`Unable to determine verified status from /verify response. Last body: ${lastBody}`);
}

// ── Test suite ────────────────────────────────────────────────────────────────

describe("e2e: credential import → proof request response (via MCP tool handlers)", () => {
  let walletClient: WalletClient;
  let handlers: Map<string, (args: unknown) => Promise<unknown>>;

  beforeAll(async () => {
    requireLiveTestEnv();

    const uniqueWalletName = `proof-e2e-wallet-${Date.now()}-${Math.random()}`;
    walletClient = new WalletClient(uniqueWalletName, "testnet");

    const wallet = await walletClient.initialize();
    const didClient = new DIDClient(wallet);
    const credentialClient = new CredentialClient(wallet);

    handlers = new Map([
      ...getDIDHandlers(didClient),
      ...getCredentialHandlers(credentialClient),
    ]) as Map<string, (args: unknown) => Promise<unknown>>;
  });

  afterAll(async () => {
    if (walletClient) {
      await walletClient.waitForIdle();
    }
    if (walletClient?.isInitialized()) {
      try {
        await walletClient.deleteWallet();
        await walletClient.waitForIdle();
      } catch (error) {
        console.error("Error cleaning up wallet:", error);
      }
    }
  });

  it("creates a DID, imports a credential, responds to a proof request, and the presentation verifies", async () => {
    // ── Step 1: create a DID ─────────────────────────────────────────────────
    const createDIDResult = parseToolResult(await handlers.get("create_did")!({})) as any;
    expect(createDIDResult.success).toBe(true);
    expect(createDIDResult.did).toMatch(/^did:/);

    // ── Step 2: import credential ────────────────────────────────────────────
    const importResult = parseToolResult(
      await handlers.get("import_credential")!({ uri: OID4VCI_TEST_OFFER_URI })
    ) as any;
    expect(importResult.success).toBe(true);

    // ── Step 3: create proof request via Truvera API ─────────────────────────
    const proofRequest = await createProofRequestFromTemplate(PROOF_TEMPLATE_ID);
    expect(proofRequest).toBeDefined();

    // ── Step 4: respond to proof request via MCP tool (not yet implemented) ──
    const presentationResult = parseToolResult(
      await handlers.get("respond_to_proof_request")!({ proofRequest })
    ) as any;
    expect(presentationResult.success).toBe(true);
    expect(presentationResult.presentation).toBeDefined();

    // ── Step 5: verify the presentation ─────────────────────────────────────
    const verification = await verifyPresentation(presentationResult.presentation);
    expect(verification.verified).toBe(true);
  });
});
