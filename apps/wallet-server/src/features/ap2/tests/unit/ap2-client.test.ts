import { describe, it, expect } from "vitest";
import * as bs58 from "base58-universal";
import { Secp256r1Keypair } from "@docknetwork/crypto-utils/keypairs";
import { secp256r1PublicKeyToJwk } from "@docknetwork/crypto-utils/vc";
import { verifyClosedCheckoutMandate, verifyClosedPaymentMandate } from "@docknetwork/ap2";
import { AP2Client } from "../../client.js";
import type { IDIDProvider } from "@docknetwork/wallet-sdk-core/lib/types.js";

// A fake IDIDProvider backed by real secp256r1 keypairs, so this test
// exercises the real @docknetwork/ap2 signing/verification code through
// AP2Client's actual wiring, without needing a real wallet/data store.
function createFakeProvider(): { provider: IDIDProvider; keyIdToKeypair: Map<string, any> } {
  const keyIdToKeypair = new Map<string, any>();
  let counter = 0;

  const provider = {
    async createSigningKey({ controller }: { controller: string }) {
      const keypair = Secp256r1Keypair.random();
      const id = `${controller}#ap2-key-${(counter += 1)}`;
      keyIdToKeypair.set(id, keypair);
      const publicKeyBytes = keypair.publicKey().value.bytes;
      return {
        id,
        controller,
        type: "EcdsaSecp256r1VerificationKey2019",
        publicKeyBase58: bs58.encode(publicKeyBytes),
      };
    },
    async signWithKeyId({ keyId, data }: { keyId: string; data: Uint8Array }) {
      const keypair = keyIdToKeypair.get(keyId);
      if (!keypair) throw new Error(`No stored key document found for keyId: ${keyId}`);
      return new Uint8Array(keypair.sign(data).bytes);
    },
  } as unknown as IDIDProvider;

  return { provider, keyIdToKeypair };
}

describe("unit: AP2Client (real crypto, fake wallet provider)", () => {
  const merchant = { id: "merchant_1", name: "Demo Merchant", website: "https://demo-merchant.example" };

  it("issues and verifies an autonomous Checkout + Payment mandate chain", async () => {
    const { provider, keyIdToKeypair } = createFakeProvider();
    const client = new AP2Client(provider);

    const user = await client.createSigningKey({ controller: "did:key:zUser" });
    const agent = await client.createSigningKey({ controller: "did:key:zAgent" });

    const openCheckout = await client.issueOpenCheckoutMandate({
      keyId: user.keyId,
      publicJwk: agent.publicJwk,
      constraints: [
        {
          type: "checkout.line_items",
          items: [{ id: "line_1", quantity: 1, acceptable_items: [{ id: "SKU-1", title: "Widget" }] }],
        },
        { type: "checkout.allowed_merchants", allowed: [merchant] },
      ],
    });
    expect(openCheckout.presentation).toContain("~");

    const checkoutJwt = "eyJhbGciOiJFUzI1NiJ9.eyJvcmRlcl9pZCI6Im9yZGVyLTEifQ.sig";
    const closedCheckout = await client.issueClosedCheckoutMandate({
      keyId: agent.keyId,
      checkoutJwt,
      nonce: "nonce-1",
      openMandatePresentation: openCheckout.presentation,
    });

    const agentPublicKeyBytes = keyIdToKeypair.get(agent.keyId).publicKey().value.bytes;
    const checkoutVerification = verifyClosedCheckoutMandate(closedCheckout.presentation, {
      holderJwk: secp256r1PublicKeyToJwk(agentPublicKeyBytes),
      openMandatePresentation: openCheckout.presentation,
    });
    expect(checkoutVerification.verified).toBe(true);
    expect(checkoutVerification.checkoutJwt).toBe(checkoutJwt);

    const openPayment = await client.issueOpenPaymentMandate({
      keyId: user.keyId,
      publicJwk: agent.publicJwk,
      constraints: [
        { type: "payment.allowed_payees", allowed: [merchant] },
        { type: "payment.reference", conditional_transaction_id: "digest-1" },
      ],
    });

    const closedPayment = await client.issueClosedPaymentMandate({
      keyId: agent.keyId,
      checkoutJwt,
      payee: merchant,
      paymentAmount: { amount: 19900, currency: "USD" },
      paymentInstrument: { id: "stub", type: "card", description: "Card ****4242" },
      nonce: "nonce-2",
      openMandatePresentation: openPayment.presentation,
    });
    expect(closedPayment.transactionId).toBe(closedCheckout.checkoutHash);

    const paymentVerification = verifyClosedPaymentMandate(closedPayment.presentation, {
      holderJwk: secp256r1PublicKeyToJwk(agentPublicKeyBytes),
      checkoutJwt,
      openMandatePresentation: openPayment.presentation,
    });
    expect(paymentVerification.verified).toBe(true);
    expect(paymentVerification.transactionIdVerified).toBe(true);
  });
});
