import dotenv from 'dotenv';

dotenv.config();
dotenv.config({ path: '.env.test', override: true });
dotenv.config({ path: '.env.tests', override: true });

const LIVE_MODE = process.env.TRUVERA_RUN_LIVE_TESTS === 'true';
const API_KEY = process.env.TRUVERA_API_KEY;

export const API_ENDPOINT = process.env.TRUVERA_API_ENDPOINT;
export const ISSUER_DID = process.env.TRUVERA_API_ISSUER_DID ?? 'did:example:issuer';
export const SUBJECT_DID = process.env.TRUVERA_API_SUBJECT_DID ?? 'did:example:subject';
export const liveApiKey = API_KEY;
export const shouldRunLiveIntegrationTests = LIVE_MODE && !!API_KEY;
export const liveTestSkipReason = !LIVE_MODE
  ? 'TRUVERA_RUN_LIVE_TESTS=true is required to run live integration tests'
  : !API_KEY
    ? 'TRUVERA_API_KEY is required to run live integration tests'
    : undefined;
