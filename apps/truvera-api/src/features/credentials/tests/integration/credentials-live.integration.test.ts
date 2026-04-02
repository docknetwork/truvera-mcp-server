import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { TruveraClient } from '../../../../../src/clients/index.js';
import { CredentialsClient } from '../../client.js';
import { VerifiableCredential, CredentialIssuer } from '../../../shared/credentials.js';
import {
  API_ENDPOINT,
  ISSUER_DID,
  liveApiKey,
  liveTestSkipReason,
  shouldRunLiveIntegrationTests,
} from '../../../../../tests/helpers/live-test-gate.js';

console.log('Live Integration Test - Truvera API Endpoint:', API_ENDPOINT || 'Not Provided');
console.log('Live Integration Test - Truvera API Key:', liveApiKey ? 'Provided' : 'Not Provided');
if (liveTestSkipReason) {
  console.log('Live Integration Test - Skipping:', liveTestSkipReason);
}

describe.skipIf(!shouldRunLiveIntegrationTests)('integration: CredentialClient live tests against Truvera API', () => {
  let credentialClient: CredentialsClient;
  const issuedCredentialIds: string[] = [];

  beforeAll(() => {
    const client = new TruveraClient(liveApiKey as string, API_ENDPOINT);
    credentialClient = new CredentialsClient(client);
  });

  afterAll(async () => {
    // Clean up all created credentials
    console.log('\n=== Cleaning up test credentials ===');
    let successCount = 0;
    let failCount = 0;
    
    for (const credentialId of issuedCredentialIds) {
      try {
        const result = await credentialClient.deleteCredential(credentialId);
        if (result.success) {
          successCount++;
          console.log(`✓ Deleted credential: ${credentialId}`);
        } else {
          failCount++;
          console.log(`✗ Failed to delete credential: ${credentialId}`, result.error);
        }
      } catch (error) {
        failCount++;
        console.log(`✗ Error deleting credential: ${credentialId}`, error);
      }
    }
    
    console.log(`Cleanup complete: ${successCount} deleted, ${failCount} failed`);
    console.log('=====================================\n');
  });

  it('calls issue_credential and succeeds', { timeout: 120000 }, async () => {
    console.log('Starting issue_credential live integration test');
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
    
    // Track credential for cleanup
    if (credential.id) {
      issuedCredentialIds.push(credential.id);
      console.log('Tracked credential for cleanup:', credential.id);
    }
  });
});
