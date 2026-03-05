import { describe, it, expect, beforeAll } from 'vitest';
import { TruveraClient } from '../../../../../src/clients/index.js';
import dotenv from 'dotenv';
import { CredentialsClient } from '../../client.js';
import { VerifiableCredential, CredentialIssuer } from '../../../shared/credentials.js';

// Load environment variables from .env (default location)
dotenv.config();
// Optionally override with test-specific values from .env.test or .env.tests
dotenv.config({ path: '.env.test', override: true });
dotenv.config({ path: '.env.tests', override: true });

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
        issuer: {
          id: ISSUER_DID,
        },
        credentialSubject: {
          id: 'did:example:subject',
          name: 'Test User',
        },
      },
    });
    console.log(response);
    expect(response.success).toBe(true);
    expect(response.data).toBeDefined();

    const credential = response.data as VerifiableCredential;
    expect(credential).toBeDefined();
    expect(credential.type).toContain('VerifiableCredential');
    expect(credential.type).toContain('TestCredential');
    expect(credential.credentialSubject).toBeDefined();
    expect((credential.credentialSubject as any).name).toBe('Test User');
    expect(credential.id).toBeDefined();
    expect(credential.issuanceDate).toBeDefined();
    expect(credential.proof).toBeDefined();
    expect(credential.issuer).toBeDefined();

    expect(typeof credential.issuer).toBe('object');
    const issuerObj = credential.issuer as CredentialIssuer;
    expect(issuerObj.id).toBe(ISSUER_DID);
    
  });
});
