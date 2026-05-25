/**
 * Live end-to-end test for the proof request response flow, exercised through
 * the MCP tool handler layer.
 *
 * Flow:
 * 1) Create a DID via the `create_did` tool handler
 * 2) Import a credential via the `import_credential` tool handler
 * 3) Create a proof request from the predefined template via Truvera API (direct HTTP)
 * 4) Respond to the proof request via the `respond_to_proof_request` tool handler
 *    → builds and auto-submits the presentation
 * 5) Assert verifier-side status reports the proof request as passed
 * 6) Assert sharing details are returned to the LLM
 * 7) Verify the presentation via Truvera /verify (direct HTTP)
 *    → cryptographic verification must pass
 *
 * Requirements:
 *   TRUVERA_RUN_LIVE_TESTS=true
 *   TRUVERA_API_KEY=<key>
 *
 * Run via: npm run test:integration
 */

import os from "os";
import path from "path";
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

function extractObjectCandidate(parsed: any): Record<string, unknown>[] {
  return [
    parsed,
    parsed?.data,
    parsed?.proofRequest,
    parsed?.request,
    parsed?.data?.proofRequest,
    parsed?.data?.request,
  ].filter((item) => item && typeof item === "object");
}

function extractProofRequestId(container: Record<string, unknown>): string | undefined {
  const candidates = [
    container?.id,
    (container as any)?.proofRequest?.id,
    (container as any)?.request?.id,
  ];

  return candidates.find((candidate): candidate is string => typeof candidate === "string");
}

function extractResponseUrl(container: Record<string, unknown>): string | undefined {
  const candidates = [
    container?.response_url,
    (container as any)?.responseUrl,
    (container as any)?.proofRequest?.response_url,
    (container as any)?.proofRequest?.responseUrl,
    (container as any)?.request?.response_url,
    (container as any)?.request?.responseUrl,
  ];

  return candidates.find((candidate): candidate is string => typeof candidate === "string");
}

function extractVerifiedState(payload: unknown): boolean | undefined {
  const parsed = payload as any;
  const candidates: unknown[] = [
    parsed,
    parsed?.data,
    parsed?.result,
    parsed?.presentationResult,
    parsed?.presentation_result,
    parsed?.data?.result,
    parsed?.data?.presentationResult,
    parsed?.data?.presentation_result,
  ];

  for (const candidate of candidates) {
    if (candidate && typeof candidate === "object" && typeof (candidate as any).verified === "boolean") {
      return (candidate as any).verified;
    }
  }

  return undefined;
}

async function seedSecondMatchingCredentialInWallet(walletClient: WalletClient): Promise<string> {
  const { createCredentialProvider } = await import("@docknetwork/wallet-sdk-core/lib/credential-provider.js");
  const provider = createCredentialProvider({ wallet: walletClient.getWallet() });
  const allCredentials = await provider.getCredentials();

  if (!Array.isArray(allCredentials) || allCredentials.length === 0) {
    throw new Error("Cannot seed second credential: wallet has no credentials.");
  }

  const baseCredential = allCredentials[0];
  const baseId = baseCredential?.id || baseCredential?.credential?.id;
  if (!baseId || typeof baseId !== "string") {
    throw new Error("Cannot seed second credential: source credential id missing.");
  }

  const clone = JSON.parse(JSON.stringify(baseCredential));
  const cloneId = `${baseId}-clone-${Date.now()}`;

  if (clone && typeof clone === "object") {
    clone.id = cloneId;
    if (clone.credential && typeof clone.credential === "object") {
      clone.credential.id = cloneId;
    }
  }

  const added = await provider.addCredential(clone);
  const addedId = added?.id || added?.credential?.id;
  if (!addedId || typeof addedId !== "string") {
    throw new Error("Failed to seed second credential in wallet.");
  }

  return addedId;
}

/**
 * Call the Truvera API to create a fresh proof request from the given template.
 * Returns the full proof request object plus its id/response_url metadata.
 */
async function createProofRequestFromTemplate(templateId: string): Promise<{
  proofRequest: Record<string, unknown>;
  proofRequestId?: string;
  responseUrl: string;
}> {
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
  const candidates = extractObjectCandidate(parsed);
  const proofRequest = candidates.find((c) => typeof (c as any).request === "object") as
    | Record<string, unknown>
    | undefined;

  if (!proofRequest) {
    throw new Error(`Proof request object not found in API response: ${raw}`);
  }

  const responseUrl = candidates
    .map((candidate) => extractResponseUrl(candidate))
    .find((value): value is string => typeof value === "string");

  if (!responseUrl) {
    throw new Error(`proofRequest.response_url not found in API response: ${raw}`);
  }

  const proofRequestId = candidates
    .map((candidate) => extractProofRequestId(candidate))
    .find((value): value is string => typeof value === "string");

  return { proofRequest, proofRequestId, responseUrl };
}

async function waitForProofRequestVerified(proofRequestId: string, timeoutMs: number = 30000): Promise<boolean> {
  const startedAt = Date.now();
  let lastBody = "";

  while (Date.now() - startedAt < timeoutMs) {
    const response = await fetch(`${TRUVERA_API_ENDPOINT}/proof-requests/${encodeURIComponent(proofRequestId)}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${liveApiKey}`,
      },
    });

    const raw = await response.text();
    lastBody = raw;

    if (response.ok) {
      try {
        const parsed = raw ? JSON.parse(raw) : {};
        const verified = extractVerifiedState(parsed);
        if (typeof verified === "boolean") {
          return verified;
        }
      } catch {
        // keep polling until timeout
      }
    }

    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  throw new Error(`Timed out waiting for proof request verification state. Last response body: ${lastBody}`);
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
    const dbPath = path.join(os.tmpdir(), `${uniqueWalletName}.db`);
    walletClient = new WalletClient(uniqueWalletName, "testnet", dbPath);

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
    const { proofRequest, proofRequestId, responseUrl } = await createProofRequestFromTemplate(PROOF_TEMPLATE_ID);
    expect(proofRequest).toBeDefined();
    expect(responseUrl).toMatch(/^https?:\/\//);

    // ── Step 4: respond to proof request via MCP tool (auto-submit enabled) ──
    const presentationResult = parseToolResult(
      await handlers.get("respond_to_proof_request")!({ proofRequest })
    ) as any;
    expect(presentationResult.success).toBe(true);
    expect(presentationResult.status).toBe("completed");
    expect(presentationResult.presentation).toBeDefined();
    expect(presentationResult.submission).toBeDefined();
    expect(presentationResult.submission.submitted).toBe(true);
    expect(presentationResult.submission.responseUrl).toBe(responseUrl);

    // ── Step 5: assert verifier-side proof request status passes ────────────
    if (proofRequestId) {
      const verifierAccepted = await waitForProofRequestVerified(proofRequestId);
      expect(verifierAccepted).toBe(true);
    }

    // ── Step 6: assert sharing details are returned to the LLM ──────────────
    expect(presentationResult.sharedPresentationDetails).toBeDefined();
    expect(typeof presentationResult.sharedPresentationDetails.credentialCount).toBe("number");
    expect(Array.isArray(presentationResult.sharedPresentationDetails.credentials)).toBe(true);

    // ── Step 7: verify the presentation cryptographically ───────────────────
    const verification = await verifyPresentation(presentationResult.presentation);
    expect(verification.verified).toBe(true);
  });

  it("returns needs_input when multiple credentials match, then completes after selection is provided", async () => {
    const createDIDResult = parseToolResult(await handlers.get("create_did")!({})) as any;
    expect(createDIDResult.success).toBe(true);
    expect(createDIDResult.did).toMatch(/^did:/);

    const importResult = parseToolResult(
      await handlers.get("import_credential")!({ uri: OID4VCI_TEST_OFFER_URI })
    ) as any;
    expect(importResult.success).toBe(true);

    const seededCredentialId = await seedSecondMatchingCredentialInWallet(walletClient);
    expect(typeof seededCredentialId).toBe("string");

    const { proofRequest, proofRequestId, responseUrl } = await createProofRequestFromTemplate(PROOF_TEMPLATE_ID);
    expect(responseUrl).toMatch(/^https?:\/\//);

    const firstAttempt = parseToolResult(
      await handlers.get("respond_to_proof_request")!({
        proofRequest,
        interactive: true,
      })
    ) as any;

    expect(firstAttempt.success).toBe(true);
    expect(firstAttempt.status).toBe("needs_input");
    expect(Array.isArray(firstAttempt.requiredDecisions)).toBe(true);
    expect(Array.isArray(firstAttempt.candidateCredentials)).toBe(true);
    expect(firstAttempt.candidateCredentials.length).toBeGreaterThan(1);

    const selectedCredentialId = firstAttempt.candidateCredentials[0].credentialId;
    expect(typeof selectedCredentialId).toBe("string");

    const secondAttempt = parseToolResult(
      await handlers.get("respond_to_proof_request")!({
        proofRequest,
        interactive: true,
        selectedCredentialIds: [selectedCredentialId],
        attributesToRevealByCredential: {},
      })
    ) as any;

    expect(secondAttempt.success).toBe(true);
    expect(secondAttempt.status).toBe("completed");
    expect(secondAttempt.presentation).toBeDefined();
    expect(secondAttempt.submission).toBeDefined();
    expect(secondAttempt.submission.submitted).toBe(true);
    expect(secondAttempt.submission.responseUrl).toBe(responseUrl);
    expect(secondAttempt.selectedCredentialIds).toEqual([selectedCredentialId]);

    expect(secondAttempt.sharedPresentationDetails).toBeDefined();
    expect(typeof secondAttempt.sharedPresentationDetails.credentialCount).toBe("number");
    expect(Array.isArray(secondAttempt.sharedPresentationDetails.credentials)).toBe(true);

    if (proofRequestId) {
      const verifierAccepted = await waitForProofRequestVerified(proofRequestId);
      expect(verifierAccepted).toBe(true);
    }

    const verification = await verifyPresentation(secondAttempt.presentation);
    expect(verification.verified).toBe(true);
  });
});
