import dotenv from "dotenv";

dotenv.config();
dotenv.config({ path: ".env.test", override: true });
dotenv.config({ path: ".env.tests", override: true });

const LIVE_MODE = process.env.TRUVERA_RUN_LIVE_TESTS === "true";
const API_KEY = process.env.TRUVERA_API_KEY;

export const TRUVERA_API_ENDPOINT =
  process.env.TRUVERA_API_ENDPOINT || "https://api-testnet.truvera.io";

export const liveApiKey = API_KEY;

export const shouldRunLiveTests = LIVE_MODE && !!API_KEY;

export const liveTestSkipReason = !LIVE_MODE
  ? "TRUVERA_RUN_LIVE_TESTS=true is required to run live tests"
  : !API_KEY
    ? "TRUVERA_API_KEY is required to run live tests"
    : undefined;

/**
 * Call at the start of a `beforeAll` to make the suite fail loudly instead of
 * silently skipping when live-test env vars are not configured.
 */
export function requireLiveTestEnv(): void {
  if (liveTestSkipReason) {
    throw new Error(`Live test env not configured: ${liveTestSkipReason}`);
  }
}

/**
 * Returns the DID to use as the credential issuer. Checks TRUVERA_API_ISSUER_DID
 * first (explicit override), then falls back to the first DID registered in the
 * account via GET /dids.
 */
export async function fetchIssuerDid(): Promise<string> {
  if (process.env.TRUVERA_API_ISSUER_DID) {
    return process.env.TRUVERA_API_ISSUER_DID;
  }
  const res = await fetch(`${TRUVERA_API_ENDPOINT}/dids`, {
    headers: { Authorization: `Bearer ${liveApiKey}` },
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`GET /dids failed (${res.status}): ${text}`);
  const parsed: any = JSON.parse(text);
  const list: any[] = Array.isArray(parsed) ? parsed : Array.isArray(parsed?.data) ? parsed.data : [];
  const first = list[0];
  const did = typeof first === "string" ? first : (first?.id ?? first?.did);
  if (!did) {
    throw new Error(
      "No DIDs found in account. Set TRUVERA_API_ISSUER_DID or register a DID in the Truvera platform."
    );
  }
  return did;
}
