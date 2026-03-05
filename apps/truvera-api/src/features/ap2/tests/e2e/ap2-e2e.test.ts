/**
 * AP2 E2E Tests
 * End-to-end tests for issuing and verifying AP2 mandates using real Truvera API
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { TruveraClient } from '../../../../clients/index.js';
import { AP2Client } from '../../client.js';
import { CredentialsClient } from '../../../credentials/client.js';
import dotenv from 'dotenv';

// Load environment variables from .env (default location)
dotenv.config();
// Optionally override with test-specific values from .env.test
dotenv.config({ path: '.env.test', override: true });

const API_KEY = process.env.TRUVERA_API_KEY;
const API_ENDPOINT = process.env.TRUVERA_API_ENDPOINT;
const ISSUER_DID = process.env.TRUVERA_API_ISSUER_DID ?? 'did:example:issuer';
const SUBJECT_DID = process.env.TRUVERA_API_SUBJECT_DID ?? 'did:example:subject';

console.log('AP2 E2E Test - Truvera API Endpoint:', API_ENDPOINT || 'Not Provided');
console.log('AP2 E2E Test - Truvera API Key:', API_KEY ? 'Provided' : 'Not Provided');
console.log('AP2 E2E Test - Issuer DID:', ISSUER_DID);

// Skip the suite if no API key is provided
const shouldRunE2E = !!API_KEY;

describe.skipIf(!shouldRunE2E)('e2e: AP2Client mandate issuance tests', () => {
  let ap2Client: AP2Client;
  let truveraClient: TruveraClient;
  let credentialsClient: CredentialsClient;
  const issuedCredentialIds: string[] = [];

  beforeAll(() => {
    truveraClient = new TruveraClient(API_KEY as string, API_ENDPOINT);
    ap2Client = new AP2Client(truveraClient);
    credentialsClient = new CredentialsClient(truveraClient);
  });

  afterAll(async () => {
    // Clean up all created credentials
    console.log('\n=== Cleaning up test credentials ===');
    let successCount = 0;
    let failCount = 0;
    
    for (const credentialId of issuedCredentialIds) {
      try {
        const result = await credentialsClient.deleteCredential(credentialId);
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

  describe('Cart Mandate (Human-Present)', () => {
    it('should issue a cart mandate successfully', { timeout: 30000 }, async () => {
      console.log('Starting issue Cart Mandate e2e test');
      
      const mandateId = `cart_${Date.now()}`;
      const response = await ap2Client.issueCartMandate({
        mandate_id: mandateId,
        cart_items: [
          { label: 'Test Product 1', currency: 'USD', value: 29.99 },
          { label: 'Test Product 2', currency: 'USD', value: 49.99 },
          { label: 'Shipping', currency: 'USD', value: 5.00 },
        ],
        total_amount: { currency: 'USD', value: 84.98 },
        payment_method: 'credit_card',
        merchant_id: 'merchant_test_123',
        payer_id: 'payer_test_456',
        payment_processor_url: 'https://payment.example.com',
        issuer_did: ISSUER_DID,
        subject_did: SUBJECT_DID,
      });

      console.log('Cart Mandate Response:', JSON.stringify(response, null, 2));

      expect(response.success).toBe(true);
      expect(response.data).toBeDefined();

      const credential = response.data as any;
      expect(credential.type).toContain('VerifiableCredential');
      expect(credential.type).toContain('CartMandate');
      expect(credential.credentialSubject).toBeDefined();
      expect(credential.credentialSubject.mandateType).toBe('CartMandate');
      expect(credential.credentialSubject.mandateId).toBe(mandateId);
      expect(credential.credentialSubject.cartMandate).toBeDefined();
      expect(credential.credentialSubject.cartMandate.contents).toBeDefined();
      expect(credential.credentialSubject.cartMandate.contents.id).toBe(mandateId);
      expect(credential.credentialSubject.merchantId).toBe('merchant_test_123');
      expect(credential.credentialSubject.payerId).toBe('payer_test_456');
      expect(credential.id).toBeDefined();
      expect(credential.issuanceDate).toBeDefined();
      expect(credential.proof).toBeDefined();

      // Store credential ID for potential cleanup
      if (credential.id) {
        issuedCredentialIds.push(credential.id);
      }

      console.log('✓ Cart Mandate issued successfully:', credential.id);
    });
  });

  describe('Intent Mandate (Human-Not-Present)', () => {
    it('should issue an intent mandate successfully', { timeout: 30000 }, async () => {
      console.log('Starting issue Intent Mandate e2e test');
      
      const mandateId = `intent_${Date.now()}`;
      const response = await ap2Client.issueIntentMandate({
        mandate_id: mandateId,
        shopping_prompt: 'Buy concert tickets for Taylor Swift when they go on sale, maximum budget $1000, prefer front row seats',
        budget_max_currency: 'USD',
        budget_max_value: 1000,
        ttl_seconds: 86400, // 24 hours
        product_categories: ['entertainment', 'concert_tickets'],
        specific_skus: ['TAYLOR_SWIFT_2026'],
        merchant_preference: 'Ticketmaster',
        payment_methods: ['credit_card', 'debit_card'],
        refundable: true,
        payer_id: 'payer_test_789',
        payee_id: 'ticketmaster_merchant_001',
        issuer_did: ISSUER_DID,
        subject_did: SUBJECT_DID,
      });

      console.log('Intent Mandate Response:', JSON.stringify(response, null, 2));

      expect(response.success).toBe(true);
      expect(response.data).toBeDefined();

      const credential = response.data as any;
      expect(credential.type).toContain('VerifiableCredential');
      expect(credential.type).toContain('IntentMandate');
      expect(credential.credentialSubject).toBeDefined();
      expect(credential.credentialSubject.mandateType).toBe('IntentMandate');
      expect(credential.credentialSubject.mandateId).toBe(mandateId);
      expect(credential.credentialSubject.intentMandate).toBeDefined();
      expect(credential.credentialSubject.intentMandate.contents).toBeDefined();
      expect(credential.credentialSubject.intentMandate.contents.id).toBe(mandateId);
      expect(credential.credentialSubject.intentMandate.contents.shopping_intent).toBeDefined();
      expect(credential.credentialSubject.intentMandate.contents.shopping_intent.prompt).toContain('concert tickets');
      expect(credential.credentialSubject.intentMandate.contents.shopping_intent.budget_max.value).toBe(1000);
      expect(credential.credentialSubject.intentMandate.contents.ttl).toBe(86400);
      expect(credential.credentialSubject.payerId).toBe('payer_test_789');
      expect(credential.id).toBeDefined();
      expect(credential.issuanceDate).toBeDefined();
      expect(credential.proof).toBeDefined();

      // Store credential ID for potential cleanup
      if (credential.id) {
        issuedCredentialIds.push(credential.id);
      }

      console.log('✓ Intent Mandate issued successfully:', credential.id);
    });

    it('should issue a minimal intent mandate successfully', { timeout: 30000 }, async () => {
      console.log('Starting issue minimal Intent Mandate e2e test');
      
      const mandateId = `intent_minimal_${Date.now()}`;
      const response = await ap2Client.issueIntentMandate({
        mandate_id: mandateId,
        shopping_prompt: 'Buy coffee beans when price drops below $15/lb',
        budget_max_currency: 'USD',
        budget_max_value: 50,
        payer_id: 'payer_test_minimal',
        issuer_did: ISSUER_DID,
        subject_did: SUBJECT_DID,
      });

      console.log('Minimal Intent Mandate Response:', JSON.stringify(response, null, 2));

      expect(response.success).toBe(true);
      expect(response.data).toBeDefined();

      const credential = response.data as any;
      expect(credential.type).toContain('IntentMandate');
      expect(credential.credentialSubject.mandateId).toBe(mandateId);
      expect(credential.credentialSubject.intentMandate.contents.shopping_intent.budget_max.value).toBe(50);

      // Store credential ID for potential cleanup
      if (credential.id) {
        issuedCredentialIds.push(credential.id);
      }

      console.log('✓ Minimal Intent Mandate issued successfully:', credential.id);
    });
  });

  describe('Payment Mandate (Network Visibility)', () => {
    it('should issue a payment mandate for human-present transaction', { timeout: 30000 }, async () => {
      console.log('Starting issue Payment Mandate (human-present) e2e test');
      
      const paymentMandateId = `payment_${Date.now()}`;
      const response = await ap2Client.issuePaymentMandate({
        payment_mandate_id: paymentMandateId,
        payment_details_id: 'order_12345',
        total_currency: 'USD',
        total_value: 299.99,
        payment_method: 'credit_card',
        merchant_agent: 'MerchantBot_v1.0',
        shopping_agent: 'ShopperAssistant_v2.1',
        human_present: true,
        refund_period_days: 30,
        issuer_did: ISSUER_DID,
        subject_did: SUBJECT_DID,
      });

      console.log('Payment Mandate Response:', JSON.stringify(response, null, 2));

      expect(response.success).toBe(true);
      expect(response.data).toBeDefined();

      const credential = response.data as any;
      expect(credential.type).toContain('VerifiableCredential');
      expect(credential.type).toContain('PaymentMandate');
      expect(credential.credentialSubject).toBeDefined();
      expect(credential.credentialSubject.mandateType).toBe('PaymentMandate');
      expect(credential.credentialSubject.mandateId).toBe(paymentMandateId);
      expect(credential.credentialSubject.paymentMandate).toBeDefined();
      expect(credential.credentialSubject.paymentMandate.payment_mandate_contents).toBeDefined();
      expect(credential.credentialSubject.paymentMandate.payment_mandate_contents.payment_mandate_id).toBe(paymentMandateId);
      expect(credential.credentialSubject.paymentMandate.payment_mandate_contents.human_present).toBe(true);
      expect(credential.credentialSubject.paymentMandate.payment_mandate_contents.payment_details_total.amount.value).toBe(299.99);
      expect(credential.id).toBeDefined();
      expect(credential.issuanceDate).toBeDefined();
      expect(credential.proof).toBeDefined();

      // Store credential ID for potential cleanup
      if (credential.id) {
        issuedCredentialIds.push(credential.id);
      }

      console.log('✓ Payment Mandate (human-present) issued successfully:', credential.id);
    });

    it('should issue a payment mandate for human-not-present transaction', { timeout: 30000 }, async () => {
      console.log('Starting issue Payment Mandate (human-not-present) e2e test');
      
      const paymentMandateId = `payment_autonomous_${Date.now()}`;
      const response = await ap2Client.issuePaymentMandate({
        payment_mandate_id: paymentMandateId,
        payment_details_id: 'order_67890',
        total_currency: 'USD',
        total_value: 49.99,
        payment_method: 'digital_wallet',
        merchant_agent: 'AutonomousMerchant_v3.0',
        shopping_agent: 'AIShopperPro_v4.2',
        human_present: false,
        issuer_did: ISSUER_DID,
        subject_did: SUBJECT_DID,
      });

      console.log('Payment Mandate (autonomous) Response:', JSON.stringify(response, null, 2));

      expect(response.success).toBe(true);
      expect(response.data).toBeDefined();

      const credential = response.data as any;
      expect(credential.type).toContain('PaymentMandate');
      expect(credential.credentialSubject.paymentMandate.payment_mandate_contents.human_present).toBe(false);
      expect(credential.credentialSubject.paymentMandate.payment_mandate_contents.merchant_agent).toBe('AutonomousMerchant_v3.0');
      expect(credential.credentialSubject.paymentMandate.payment_mandate_contents.shopping_agent).toBe('AIShopperPro_v4.2');

      // Store credential ID for potential cleanup
      if (credential.id) {
        issuedCredentialIds.push(credential.id);
      }

      console.log('✓ Payment Mandate (human-not-present) issued successfully:', credential.id);
    });
  });

  describe('Mandate Verification', () => {
    it('should verify an issued mandate successfully', { timeout: 30000 }, async () => {
      console.log('Starting verify mandate e2e test');

      // First issue a simple cart mandate to verify
      const mandateId = `cart_verify_${Date.now()}`;
      const issueResponse = await ap2Client.issueCartMandate({
        mandate_id: mandateId,
        cart_items: [
          { label: 'Verification Test Item', currency: 'USD', value: 10.00 },
        ],
        total_amount: { currency: 'USD', value: 10.00 },
        payment_method: 'test_card',
        merchant_id: 'merchant_verify',
        payer_id: 'payer_verify',
        issuer_did: ISSUER_DID,
        subject_did: SUBJECT_DID,
      });

      expect(issueResponse.success).toBe(true);
      const credential = issueResponse.data as any;

      console.log('Issued credential for verification:', credential.id);

      // Track this credential for cleanup
      if (credential.id) {
        issuedCredentialIds.push(credential.id);
      }

      // Now verify it - pass the full credential document
      const verifyResponse = await ap2Client.verifyMandate(credential);

      console.log('Verification Response:', JSON.stringify(verifyResponse, null, 2));

      expect(verifyResponse.success).toBe(true);
      expect(verifyResponse.data).toBeDefined();

      const verificationResult = verifyResponse.data as any;
      expect(verificationResult.verified).toBe(true);
      // Note: verification result doesn't include the credential, just the verification status
      
      console.log('✓ Mandate verified successfully');
    });
  });

  // Log summary at the end
  if (shouldRunE2E) {
    describe('Test Summary', () => {
      it('should log issued credential IDs', () => {
        console.log('\n=== AP2 E2E Test Summary ===');
        console.log(`Total credentials issued: ${issuedCredentialIds.length}`);
        console.log('Credential IDs:', issuedCredentialIds);
        console.log('Note: These credentials will be cleaned up after tests complete');
        console.log('============================\n');
        expect(issuedCredentialIds.length).toBeGreaterThan(0);
      });
    });
  }
});
