import { describe, it, expect } from "vitest";
import * as bs58 from "base58-universal";
import { Secp256r1Keypair } from "@docknetwork/crypto-utils/keypairs";
import { secp256r1PublicKeyToJwk } from "@docknetwork/crypto-utils/vc";
import {
  verifyClosedCheckoutMandate,
  verifyClosedPaymentMandate,
  resolveOpenPaymentMandateContent,
} from "@docknetwork/ap2";
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

describe("unit: AP2Client.issueClosedPaymentMandate (Open Payment Mandate constraint enforcement)", () => {
  const merchant = { id: "merchant_1", name: "Demo Merchant", website: "https://demo-merchant.example" };
  const otherMerchant = { id: "merchant_2", name: "Other Merchant" };
  const instrument = { id: "card_1", type: "card", description: "Card ****4242" };
  const otherInstrument = { id: "card_2", type: "card" };
  const checkoutJwt = "eyJhbGciOiJFUzI1NiJ9.eyJvcmRlcl9pZCI6Im9yZGVyLTEifQ.sig";

  async function setup(constraints: Array<{ type: string; [key: string]: unknown }>) {
    const { provider, keyIdToKeypair } = createFakeProvider();
    const client = new AP2Client(provider);
    const user = await client.createSigningKey({ controller: "did:key:zUser" });
    const agent = await client.createSigningKey({ controller: "did:key:zAgent" });

    const openPayment = await client.issueOpenPaymentMandate({
      keyId: user.keyId,
      publicJwk: agent.publicJwk,
      constraints: [...constraints, { type: "payment.reference", conditional_transaction_id: "digest-1" }],
    });

    return { client, user, agent, keyIdToKeypair, openMandatePresentation: openPayment.presentation };
  }

  it("rejects a paymentAmount over the payment.budget max", async () => {
    const { client, agent, openMandatePresentation } = await setup([
      { type: "payment.budget", max: 100, currency: "USD" },
    ]);

    await expect(
      client.issueClosedPaymentMandate({
        keyId: agent.keyId,
        checkoutJwt,
        payee: merchant,
        paymentAmount: { amount: 101, currency: "USD" },
        paymentInstrument: instrument,
        nonce: "nonce-1",
        openMandatePresentation,
      })
    ).rejects.toThrow(/payment\.budget/);
  });

  it("rejects a paymentAmount currency mismatching the payment.budget constraint", async () => {
    const { client, agent, openMandatePresentation } = await setup([
      { type: "payment.budget", max: 100, currency: "USD" },
    ]);

    await expect(
      client.issueClosedPaymentMandate({
        keyId: agent.keyId,
        checkoutJwt,
        payee: merchant,
        paymentAmount: { amount: 50, currency: "EUR" },
        paymentInstrument: instrument,
        nonce: "nonce-1",
        openMandatePresentation,
      })
    ).rejects.toThrow(/payment\.budget/);
  });

  it("rejects a paymentAmount outside a payment.amount_range constraint", async () => {
    const { client, agent, openMandatePresentation } = await setup([
      { type: "payment.amount_range", currency: "USD", min: 10, max: 100 },
    ]);

    await expect(
      client.issueClosedPaymentMandate({
        keyId: agent.keyId,
        checkoutJwt,
        payee: merchant,
        paymentAmount: { amount: 5, currency: "USD" },
        paymentInstrument: instrument,
        nonce: "nonce-1",
        openMandatePresentation,
      })
    ).rejects.toThrow(/payment\.amount_range/);
  });

  it("rejects a payee not in payment.allowed_payees", async () => {
    const { client, agent, openMandatePresentation } = await setup([
      { type: "payment.allowed_payees", allowed: [merchant] },
    ]);

    await expect(
      client.issueClosedPaymentMandate({
        keyId: agent.keyId,
        checkoutJwt,
        payee: otherMerchant,
        paymentAmount: { amount: 50, currency: "USD" },
        paymentInstrument: instrument,
        nonce: "nonce-1",
        openMandatePresentation,
      })
    ).rejects.toThrow(/payment\.allowed_payees/);
  });

  it("rejects a paymentInstrument not in payment.allowed_payment_instruments", async () => {
    const { client, agent, openMandatePresentation } = await setup([
      { type: "payment.allowed_payment_instruments", allowed: [instrument] },
    ]);

    await expect(
      client.issueClosedPaymentMandate({
        keyId: agent.keyId,
        checkoutJwt,
        payee: merchant,
        paymentAmount: { amount: 50, currency: "USD" },
        paymentInstrument: otherInstrument,
        nonce: "nonce-1",
        openMandatePresentation,
      })
    ).rejects.toThrow(/payment\.allowed_payment_instruments/);
  });

  it("accepts any payee/instrument/amount when no matching constraint is declared (no regression)", async () => {
    const { client, agent, openMandatePresentation } = await setup([]);

    const result = await client.issueClosedPaymentMandate({
      keyId: agent.keyId,
      checkoutJwt,
      payee: otherMerchant,
      paymentAmount: { amount: 999999, currency: "JPY" },
      paymentInstrument: otherInstrument,
      nonce: "nonce-1",
      openMandatePresentation,
    });

    expect(result.presentation).toContain("~");
  });

  it("issues a verifiable Closed Payment Mandate when within budget and allow-lists", async () => {
    const { client, agent, keyIdToKeypair, openMandatePresentation } = await setup([
      { type: "payment.budget", max: 100, currency: "USD" },
      { type: "payment.allowed_payees", allowed: [merchant] },
      { type: "payment.allowed_payment_instruments", allowed: [instrument] },
    ]);

    const result = await client.issueClosedPaymentMandate({
      keyId: agent.keyId,
      checkoutJwt,
      payee: merchant,
      paymentAmount: { amount: 100, currency: "USD" },
      paymentInstrument: instrument,
      nonce: "nonce-1",
      openMandatePresentation,
    });

    const agentPublicKeyBytes = keyIdToKeypair.get(agent.keyId).publicKey().value.bytes;
    const verification = verifyClosedPaymentMandate(result.presentation, {
      holderJwk: secp256r1PublicKeyToJwk(agentPublicKeyBytes),
      checkoutJwt,
      openMandatePresentation,
    });
    expect(verification.verified).toBe(true);
  });

  it("rejects closing with a key that doesn't match the Open Payment Mandate's cnf.jwk", async () => {
    const { provider } = createFakeProvider();
    const client = new AP2Client(provider);
    const user = await client.createSigningKey({ controller: "did:key:zUser" });
    const agent = await client.createSigningKey({ controller: "did:key:zAgent" });
    const impostor = await client.createSigningKey({ controller: "did:key:zImpostor" });

    const openPayment = await client.issueOpenPaymentMandate({
      keyId: user.keyId,
      publicJwk: agent.publicJwk,
      constraints: [{ type: "payment.reference", conditional_transaction_id: "digest-1" }],
    });

    await expect(
      client.issueClosedPaymentMandate({
        keyId: impostor.keyId,
        checkoutJwt,
        payee: merchant,
        paymentAmount: { amount: 50, currency: "USD" },
        paymentInstrument: instrument,
        nonce: "nonce-1",
        openMandatePresentation: openPayment.presentation,
      })
    ).rejects.toThrow(/cnf\.jwk/);
  });
});

describe("unit: AP2Client.issueOpenPaymentMandate (named-parameter constraint assembly)", () => {
  const merchant = { id: "merchant_1", name: "Demo Merchant", website: "https://demo-merchant.example" };
  const instrument = { id: "card_1", type: "card", description: "Card ****4242" };

  it("produces identical signed mandate content via named fields as via the equivalent raw constraints array", async () => {
    const { provider: providerA } = createFakeProvider();
    const { provider: providerB } = createFakeProvider();
    const clientA = new AP2Client(providerA);
    const clientB = new AP2Client(providerB);

    const userA = await clientA.createSigningKey({ controller: "did:key:zUserA" });
    const agentA = await clientA.createSigningKey({ controller: "did:key:zAgentA" });
    const userB = await clientB.createSigningKey({ controller: "did:key:zUserB" });
    const agentB = await clientB.createSigningKey({ controller: "did:key:zAgentB" });

    const viaNamedFields = await clientA.issueOpenPaymentMandate({
      keyId: userA.keyId,
      publicJwk: agentA.publicJwk,
      reference: { conditionalTransactionId: "digest-1" },
      budget: { max: 100, currency: "USD" },
      allowedPayees: [merchant],
      allowedPaymentInstruments: [instrument],
    });

    const viaRawConstraints = await clientB.issueOpenPaymentMandate({
      keyId: userB.keyId,
      publicJwk: agentB.publicJwk,
      constraints: [
        { type: "payment.budget", max: 100, currency: "USD" },
        { type: "payment.allowed_payees", allowed: [merchant] },
        { type: "payment.allowed_payment_instruments", allowed: [instrument] },
        { type: "payment.reference", conditional_transaction_id: "digest-1" },
      ],
    });

    const { content: contentA } = resolveOpenPaymentMandateContent(viaNamedFields.presentation);
    const { content: contentB } = resolveOpenPaymentMandateContent(viaRawConstraints.presentation);

    expect((contentA as { constraints: unknown }).constraints).toEqual((contentB as { constraints: unknown }).constraints);
  });
});
