import { describe, it, expect } from "vitest";
import { Secp256r1Keypair } from "@docknetwork/crypto-utils/keypairs";
import { secp256r1PublicKeyToJwk } from "@docknetwork/crypto-utils/vc";
import {
  buildOpenPaymentMandate,
  signOpenPaymentMandate,
  buildClosedPaymentMandate,
  signClosedPaymentMandate,
  computeCheckoutHash,
} from "@docknetwork/ap2";
import { AP2Client } from "../../client.js";

const CHECKOUT_JWT = "eyJhbGciOiJFUzI1NiJ9.eyJvcmRlcl9pZCI6Im9yZGVyLTEifQ.sig";
const MERCHANT = { id: "merchant_1", name: "Demo Merchant", website: "https://demo-merchant.example" };

async function buildClosedPaymentMandatePresentation(agentKeypair: any, userKeypair: any) {
  const holderJwk = secp256r1PublicKeyToJwk(agentKeypair.publicKey());
  const openContent = buildOpenPaymentMandate({
    vct: "mandate.payment.open.1",
    constraints: [{ type: "payment.allowed_payees", allowed: [MERCHANT] }],
    cnf: { jwk: holderJwk },
  });
  const openPresentation = await signOpenPaymentMandate(openContent, { signer: userKeypair });

  const closedContent = buildClosedPaymentMandate({
    vct: "mandate.payment.1",
    transaction_id: computeCheckoutHash(CHECKOUT_JWT),
    payee: MERCHANT,
    payment_amount: { amount: 19900, currency: "USD" },
    payment_instrument: { id: "stub", type: "card", description: "Card ****4242" },
  });
  const closedPresentation = await signClosedPaymentMandate(closedContent, {
    signer: agentKeypair,
    nonce: "nonce-1",
    openMandatePresentation: openPresentation,
  });

  return { openPresentation, closedPresentation, holderJwk };
}

describe("unit: AP2Client (truvera-api Credential Provider role)", () => {
  const client = new AP2Client();

  it("verifies a valid Closed Payment Mandate", async () => {
    const agentKeypair = Secp256r1Keypair.random();
    const userKeypair = Secp256r1Keypair.random();
    const { openPresentation, closedPresentation, holderJwk } = await buildClosedPaymentMandatePresentation(
      agentKeypair,
      userKeypair
    );

    const result = await client.verifyPaymentMandate({
      closedPaymentMandatePresentation: closedPresentation,
      holderJwk,
      checkoutJwt: CHECKOUT_JWT,
      openPaymentMandatePresentation: openPresentation,
    });

    expect(result.paymentMandateVerified).toBe(true);
    expect(result.transactionIdVerified).toBe(true);
    expect(result.sdHashVerified).toBe(true);
  });

  it("fails verification for a mandate signed by the wrong key", async () => {
    const agentKeypair = Secp256r1Keypair.random();
    const userKeypair = Secp256r1Keypair.random();
    const otherKeypair = Secp256r1Keypair.random();
    const { closedPresentation } = await buildClosedPaymentMandatePresentation(agentKeypair, userKeypair);

    const result = await client.verifyPaymentMandate({
      closedPaymentMandatePresentation: closedPresentation,
      holderJwk: secp256r1PublicKeyToJwk(otherKeypair.publicKey()),
    });

    expect(result.paymentMandateVerified).toBe(false);
    expect(result.paymentMandateError).toBeDefined();
  });

  it("issues an unsigned Payment Receipt on successful verification", async () => {
    const agentKeypair = Secp256r1Keypair.random();
    const userKeypair = Secp256r1Keypair.random();
    const { openPresentation, closedPresentation, holderJwk } = await buildClosedPaymentMandatePresentation(
      agentKeypair,
      userKeypair
    );

    const result = await client.issuePaymentToken({
      closedPaymentMandatePresentation: closedPresentation,
      holderJwk,
      checkoutJwt: CHECKOUT_JWT,
      openPaymentMandatePresentation: openPresentation,
      issuer: "mpp.acme",
      paymentId: "PAY-001",
    });

    expect(result.verification.paymentMandateVerified).toBe(true);
    expect(result.signed).toBe(false);
    expect(result.receipt).toMatchObject({
      status: "Success",
      iss: "mpp.acme",
      payment_id: "PAY-001",
    });
  });

  it("does not issue a receipt when verification fails", async () => {
    const agentKeypair = Secp256r1Keypair.random();
    const userKeypair = Secp256r1Keypair.random();
    const otherKeypair = Secp256r1Keypair.random();
    const { closedPresentation } = await buildClosedPaymentMandatePresentation(agentKeypair, userKeypair);

    const result = await client.issuePaymentToken({
      closedPaymentMandatePresentation: closedPresentation,
      holderJwk: secp256r1PublicKeyToJwk(otherKeypair.publicKey()),
      issuer: "mpp.acme",
      paymentId: "PAY-001",
    });

    expect(result.verification.paymentMandateVerified).toBe(false);
    expect(result.receipt).toBeUndefined();
  });
});
