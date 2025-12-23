import { describe, it, expect, beforeAll } from 'vitest';
import { TruveraClient } from '../../../../../src/clients/index.js';
import dotenv from 'dotenv';
import { CredentialsClient } from '../../client.js';

// Load test environment variables if present
dotenv.config({ path: '.env.tests' });

const API_KEY = process.env.TRUVERA_API_KEY;
const API_ENDPOINT = process.env.TRUVERA_API_ENDPOINT;
const ISSUER_DID = process.env.TRUVERA_API_ISSUER_DID ?? 'did:example:issuer';

console.log('E2E Test - Truvera API Endpoint:', API_ENDPOINT || 'Not Provided');
console.log('E2E Test - Truvera API Key:', API_KEY ? 'Provided' : 'Not Provided');

// Skip the suite if no API key is provided
const shouldRunE2E = !!API_KEY;

describe.skipIf(!shouldRunE2E)('e2e: CredentialClient tests for the Truvera API', () => {
  let credentialClient: CredentialsClient

  beforeAll(() => {
    const client = new TruveraClient(API_KEY as string, API_ENDPOINT);
    credentialClient = new CredentialsClient(client);
  });

  it('calls issue_credential and succeeds', { timeout: 30000 }, async () => {
    console.log('Starting issue_credential e2e test');
    const response = await credentialClient.issueCredential({
      credential: {
        type: ['VerifiableCredential', 'TestCredential'],
        issuer: ISSUER_DID,
        subject: {
          id: 'did:example:subject',
          name: 'Test User',
        },
      },
    });
    console.log(response);
    expect(response.success).toBe(true);
    });
});
