/**
 * E2E test: full BBS+ selective disclosure flow via MCP tool handlers.
 *
 * This is the exact scenario that surfaced the "Cannot read properties of
 * undefined (reading 'getItem')" bug when global.localStorage was absent.
 *
 * Flow:
 * 1) Create a wallet DID (used as credential subject)
 * 2) Create a BBS+ (dockbbs) credential issuer + offer via Truvera API
 * 3) Import the credential into the wallet via OID4VCI
 * 4) Create a proof template + proof request requiring only `startDate`
 * 5) Call respond_to_proof_request with interactive=true → expect needs_input
 * 6) Re-call with selectedCredentialIds + attributesToRevealByCredential → expect completed
 * 7) Verify the derived presentation is cryptographically valid
 *
 * Requirements:
 *   TRUVERA_RUN_LIVE_TESTS=true
 *   TRUVERA_API_KEY=<key>
 *
 * Run via: npm run test:integration
 */

import os from "os";
import path from "path";
import fs from "fs";
import { describe, it, expect, beforeAll, afterAll } from "@jest/globals";
import { LocalStorage } from "node-localstorage";

import { WalletClient } from "../../../../wallet-client";
import { DIDClient } from "../../../dids/client";
import { CredentialClient } from "../../client";
import { getDIDHandlers } from "../../../dids/tools";
import { getCredentialHandlers } from "../../tools";
import { requireLiveTestEnv, fetchIssuerDid, TRUVERA_API_ENDPOINT, liveApiKey } from "../../../../tests/helpers/live-test-gate";
import { blockchainService } from "@docknetwork/wallet-sdk-wasm/lib/services/blockchain/service.js";

// ── Helpers ───────────────────────────────────────────────────────────────────

function parseToolResult(result: unknown): any {
  const text = (result as any)?.content?.[0]?.text;
  if (typeof text !== "string") {
    throw new Error(`Unexpected tool result shape: ${JSON.stringify(result)}`);
  }
  return JSON.parse(text);
}

async function apiPost(endpoint: string, body: unknown): Promise<any> {
  const res = await fetch(`${TRUVERA_API_ENDPOINT}${endpoint}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${liveApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`POST ${endpoint} failed (${res.status}): ${text}`);
  return JSON.parse(text);
}

async function waitForProofVerified(proofRequestId: string, timeoutMs = 30_000): Promise<boolean> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const res = await fetch(`${TRUVERA_API_ENDPOINT}/proof-requests/${encodeURIComponent(proofRequestId)}`, {
      headers: { Authorization: `Bearer ${liveApiKey}` },
    });
    if (res.ok) {
      const parsed: any = JSON.parse(await res.text());
      const verified = parsed?.verified ?? parsed?.data?.verified;
      if (typeof verified === "boolean") return verified;
    }
    await new Promise((r) => setTimeout(r, 1000));
  }
  throw new Error(`Timed out waiting for proof request ${proofRequestId} to verify`);
}

async function verifyPresentation(presentation: unknown): Promise<boolean> {
  for (const payload of [presentation, { data: presentation }]) {
    const res = await fetch(`${TRUVERA_API_ENDPOINT}/verify`, {
      method: "POST",
      headers: { Authorization: `Bearer ${liveApiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) continue;
    const parsed: any = JSON.parse(await res.text());
    for (const c of [parsed, parsed?.data, parsed?.result, parsed?.data?.result]) {
      if (c && typeof c?.verified === "boolean") return c.verified;
    }
  }
  throw new Error("Unable to determine verified status from /verify response");
}

// ── Test suite ────────────────────────────────────────────────────────────────

describe("e2e: BBS+ selective disclosure (respond_to_proof_request with attributesToRevealByCredential)", () => {
  let walletClient: WalletClient;
  let handlers: Map<string, (args: unknown) => Promise<unknown>>;
  let lsDir: string;
  let issuerDid: string;

  beforeAll(async () => {
    requireLiveTestEnv();

    issuerDid = await fetchIssuerDid();

    // Install the localStorage shim — mirrors what index.ts does at server startup.
    lsDir = fs.mkdtempSync(path.join(os.tmpdir(), "wallet-bbs-e2e-ls-"));
    (globalThis as any).localStorage = new LocalStorage(lsDir);

    // Initialize the cheqd blockchain connection so accumulator queries work for
    // revocable credentials. jest.setup.js mocks init() by default (for unit tests);
    // _realInit bypasses that mock and connects to the actual cheqd testnet.
    await (blockchainService as any)._realInit({
      cheqdApiUrl: ["https://testnet.cheqd.docknode.io", "https://api.cheqd.network"],
      networkId: "testnet",
    });

    const dbPath = path.join(os.tmpdir(), `bbs-e2e-wallet-${Date.now()}.db`);
    walletClient = new WalletClient(`bbs-e2e-${Date.now()}`, "testnet", dbPath);
    const wallet = await walletClient.initialize();

    handlers = new Map([
      ...getDIDHandlers(new DIDClient(wallet)),
      ...getCredentialHandlers(new CredentialClient(wallet)),
    ]) as Map<string, (args: unknown) => Promise<unknown>>;
  });

  afterAll(async () => {
    await blockchainService.disconnect().catch(() => {});
    delete (globalThis as any).localStorage;
    if (lsDir) fs.rmSync(lsDir, { recursive: true, force: true });
    if (walletClient?.isInitialized()) {
      await walletClient.waitForIdle();
      await walletClient.deleteWallet().catch(() => {});
    }
  });

  it("creates, imports, and selectively discloses a BBS+ credential without localStorage errors", async () => {
    // ── Step 1: create wallet DID ────────────────────────────────────────────
    const didResult = parseToolResult(await handlers.get("create_did")!({}));
    expect(didResult.success).toBe(true);
    expect(didResult.did).toMatch(/^did:/);
    const holderDid: string = didResult.did;

    // ── Step 2: create BBS+ issuer + credential offer ────────────────────────
    const issuerResponse = await apiPost("/openid/issuers", {
      credentialOptions: {
        algorithm: "dockbbs",
        format: "jsonld",
        revocable: true,
        credential: {
          name: "Proof of Employment",
          type: ["VerifiableCredential", "ProofOfEmployment"],
          issuer: issuerDid,
          subject: {
            id: holderDid,
            jobTitle: "Software Engineer",
            startDate: "2023-01-15",
            department: "Engineering",
            employerName: "Acme Corp",
            employmentStatus: "Full-Time",
          },
          issuanceDate: new Date().toISOString(),
          expirationDate: new Date(Date.now() + 2 * 365 * 24 * 60 * 60 * 1000).toISOString(),
        },
      },
      singleUse: true,
    });

    const issuerId: string = issuerResponse?.id ?? issuerResponse?.data?.id;
    expect(typeof issuerId).toBe("string");

    const offerResponse = await apiPost("/openid/credential-offers", { id: issuerId });
    const rawOffer = offerResponse?.offer ?? offerResponse?.data?.offer;
    expect(rawOffer).toBeDefined();
    const { credentials: _omit, ...offerData } = rawOffer;
    const offerUri = `openid-credential-offer://?credential_offer=${encodeURIComponent(JSON.stringify(offerData))}`;

    // ── Step 3: import credential into wallet ────────────────────────────────
    const importResult = parseToolResult(await handlers.get("import_credential")!({ uri: offerUri }));
    expect(importResult.success).toBe(true);
    const credentialId: string = importResult.credential?.id;
    expect(typeof credentialId).toBe("string");

    // ── Step 4: create proof template + proof request ────────────────────────
    const templateResponse = await apiPost("/proof-templates", {
      name: `bbs-e2e-template-${Date.now()}`,
      request: {
        input_descriptors: [{
          id: "employment_startdate",
          name: "Employment Start Date",
          purpose: "Verify employment start date only",
          constraints: {
            fields: [{
              path: ["$.credentialSubject.startDate", "$.vc.credentialSubject.startDate"],
            }],
          },
        }],
      },
    });
    const templateId: string = templateResponse?.id ?? templateResponse?.data?.id;
    expect(typeof templateId).toBe("string");

    const requestResponse = await apiPost(`/proof-templates/${encodeURIComponent(templateId)}/request`, {
      name: `bbs-e2e-request-${Date.now()}`,
    });
    const proofRequest = requestResponse?.request
      ? requestResponse
      : requestResponse?.data?.request
        ? requestResponse.data
        : requestResponse;
    const proofRequestId: string = proofRequest?.id ?? proofRequest?.data?.id;
    const responseUrl: string = proofRequest?.response_url ?? proofRequest?.request?.response_url;
    expect(typeof responseUrl).toBe("string");
    expect(responseUrl).toMatch(/^https?:\/\//);

    // ── Step 5: interactive first call → needs_input ─────────────────────────
    const firstCall = parseToolResult(
      await handlers.get("respond_to_proof_request")!({ proofRequest, interactive: true })
    );
    expect(firstCall.success).toBe(true);
    expect(firstCall.status).toBe("needs_input");
    expect(Array.isArray(firstCall.candidateCredentials)).toBe(true);
    expect(firstCall.candidateCredentials.length).toBeGreaterThan(0);
    const candidate = firstCall.candidateCredentials.find((c: any) => c.credentialId === credentialId);
    expect(candidate).toBeDefined();
    expect(candidate.supportsSelectiveDisclosure).toBe(true);

    // ── Step 6: second call with selective disclosure ────────────────────────
    // This is the exact call that failed with "getItem of undefined" before the fix.
    const secondCall = parseToolResult(
      await handlers.get("respond_to_proof_request")!({
        proofRequest,
        selectedCredentialIds: [credentialId],
        attributesToRevealByCredential: { [credentialId]: ["credentialSubject.startDate"] },
        autoSubmit: true,
        interactive: false,
      })
    );
    expect(secondCall.success).toBe(true);
    expect(secondCall.status).toBe("completed");
    expect(secondCall.presentation).toBeDefined();
    expect(secondCall.submission?.submitted).toBe(true);

    // ── Step 7: verify the derived presentation ──────────────────────────────
    if (proofRequestId) {
      expect(await waitForProofVerified(proofRequestId)).toBe(true);
    }
    expect(await verifyPresentation(secondCall.presentation)).toBe(true);

    // Confirm only startDate is disclosed (BBS+ selective disclosure worked)
    const disclosed = secondCall.sharedPresentationDetails?.credentials?.[0]?.credentialSubject;
    expect(disclosed).toBeDefined();
    expect(disclosed.startDate).toBe("2023-01-15");
    expect(disclosed.jobTitle).toBeUndefined();
    expect(disclosed.department).toBeUndefined();
  });
});
