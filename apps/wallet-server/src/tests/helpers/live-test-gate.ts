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
