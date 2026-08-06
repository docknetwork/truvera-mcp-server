import { describe, it, expect } from "vitest";
import { Secp256r1Keypair } from "@docknetwork/crypto-utils/keypairs";
import { secp256r1PublicKeyToJwk } from "@docknetwork/crypto-utils/vc";
import {
  buildOpenCheckoutMandate,
  signOpenCheckoutMandate,
  buildOpenPaymentMandate,
  signOpenPaymentMandate,
  buildClosedPaymentMandate,
  signClosedPaymentMandate,
  computeCheckoutHash,
  computeSdHash,
  parseSdJwtPresentation,
} from "@docknetwork/ap2";
import { AP2Client } from "../../client.js";

const CHECKOUT_JWT = "eyJhbGciOiJFUzI1NiJ9.eyJvcmRlcl9pZCI6Im9yZGVyLTEifQ.sig";
const MERCHANT = { id: "merchant_1", name: "Demo Merchant", website: "https://demo-merchant.example" };
const PAYMENT_NONCE = "nonce-1";

async function buildOpenCheckoutMandatePresentation(userKeypair: any) {
  const content = buildOpenCheckoutMandate({
    vct: "mandate.checkout.open.1",
    constraints: [
      {
        type: "checkout.line_items",
        items: [{ id: "item-1", quantity: 1, acceptable_items: [{ id: "sku-1", title: "Widget" }] }],
      },
      { type: "checkout.allowed_merchants", allowed: [MERCHANT] },
    ],
    cnf: { jwk: secp256r1PublicKeyToJwk(userKeypair.publicKey()) },
  });
  return signOpenCheckoutMandate(content, { signer: userKeypair });
}

async function buildClosedPaymentMandatePresentation(
  agentKeypair: any,
  userKeypair: any,
  conditionalTransactionId = "digest-1"
) {
  const openContent = buildOpenPaymentMandate({
    vct: "mandate.payment.open.1",
    constraints: [
      { type: "payment.allowed_payees", allowed: [MERCHANT] },
      { type: "payment.reference", conditional_transaction_id: conditionalTransactionId },
    ],
    cnf: { jwk: secp256r1PublicKeyToJwk(agentKeypair.publicKey()) },
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
    nonce: PAYMENT_NONCE,
    openMandatePresentation: openPresentation,
  });

  return { openPresentation, closedPresentation };
}

describe("unit: AP2Client (truvera-api Credential Provider role)", () => {
  const client = new AP2Client();

  it("verifies a valid Closed Payment Mandate", async () => {
    const agentKeypair = Secp256r1Keypair.random();
    const userKeypair = Secp256r1Keypair.random();
    const { openPresentation, closedPresentation } = await buildClosedPaymentMandatePresentation(
      agentKeypair,
      userKeypair
    );

    const result = await client.verifyPaymentMandate({
      closedPaymentMandatePresentation: closedPresentation,
      userJwk: secp256r1PublicKeyToJwk(userKeypair.publicKey()),
      paymentExpectedNonce: PAYMENT_NONCE,
      checkoutJwt: CHECKOUT_JWT,
      openPaymentMandatePresentation: openPresentation,
    });

    expect(result.paymentMandateVerified).toBe(true);
    expect(result.transactionIdVerified).toBe(true);
    expect(result.sdHashVerified).toBe(true);
    expect(result.openMandateIssuerVerified).toBe(true);
  });

  it("verifies the payment.reference binding against the referenced Open Checkout Mandate", async () => {
    const agentKeypair = Secp256r1Keypair.random();
    const userKeypair = Secp256r1Keypair.random();
    const openCheckoutPresentation = await buildOpenCheckoutMandatePresentation(userKeypair);
    const conditionalTransactionId = computeSdHash(parseSdJwtPresentation(openCheckoutPresentation));
    const { openPresentation, closedPresentation } = await buildClosedPaymentMandatePresentation(
      agentKeypair,
      userKeypair,
      conditionalTransactionId
    );

    const result = await client.verifyPaymentMandate({
      closedPaymentMandatePresentation: closedPresentation,
      userJwk: secp256r1PublicKeyToJwk(userKeypair.publicKey()),
      paymentExpectedNonce: PAYMENT_NONCE,
      openPaymentMandatePresentation: openPresentation,
      openCheckoutMandatePresentation: openCheckoutPresentation,
    });

    expect(result.paymentMandateVerified).toBe(true);
    expect(result.referenceVerified).toBe(true);
  });

  it("fails verification outright when the payment.reference binding points to a different checkout", async () => {
    // @docknetwork/ap2 0.5.0 treats a reference mismatch as a hard verification
    // failure (verified: false), not merely referenceVerified: false -- see
    // its CHANGELOG entry for verifyClosedPaymentMandate's openCheckoutMandatePresentation.
    const agentKeypair = Secp256r1Keypair.random();
    const userKeypair = Secp256r1Keypair.random();
    const openCheckoutPresentation = await buildOpenCheckoutMandatePresentation(userKeypair);
    const unrelatedCheckoutPresentation = await buildOpenCheckoutMandatePresentation(userKeypair);
    const wrongTransactionId = computeSdHash(parseSdJwtPresentation(unrelatedCheckoutPresentation));
    const { openPresentation, closedPresentation } = await buildClosedPaymentMandatePresentation(
      agentKeypair,
      userKeypair,
      wrongTransactionId
    );

    const result = await client.verifyPaymentMandate({
      closedPaymentMandatePresentation: closedPresentation,
      userJwk: secp256r1PublicKeyToJwk(userKeypair.publicKey()),
      paymentExpectedNonce: PAYMENT_NONCE,
      openPaymentMandatePresentation: openPresentation,
      openCheckoutMandatePresentation: openCheckoutPresentation,
    });

    expect(result.paymentMandateVerified).toBe(false);
    expect(result.paymentMandateError).toBeDefined();
  });

  it("does not issue a receipt when the payment.reference binding fails", async () => {
    const agentKeypair = Secp256r1Keypair.random();
    const userKeypair = Secp256r1Keypair.random();
    const openCheckoutPresentation = await buildOpenCheckoutMandatePresentation(userKeypair);
    const { openPresentation, closedPresentation } = await buildClosedPaymentMandatePresentation(
      agentKeypair,
      userKeypair,
      "some-unrelated-digest"
    );

    const result = await client.issuePaymentToken({
      closedPaymentMandatePresentation: closedPresentation,
      userJwk: secp256r1PublicKeyToJwk(userKeypair.publicKey()),
      paymentExpectedNonce: PAYMENT_NONCE,
      openPaymentMandatePresentation: openPresentation,
      openCheckoutMandatePresentation: openCheckoutPresentation,
      issuer: "mpp.acme",
      paymentId: "PAY-002",
    });

    expect(result.verification.paymentMandateVerified).toBe(false);
    expect(result.signed).toBe(false);
    expect(result.receipt).toBeUndefined();
  });

  it("fails verification when userJwk does not match the Open Payment Mandate's actual issuer", async () => {
    const agentKeypair = Secp256r1Keypair.random();
    const userKeypair = Secp256r1Keypair.random();
    const otherKeypair = Secp256r1Keypair.random();
    const { openPresentation, closedPresentation } = await buildClosedPaymentMandatePresentation(
      agentKeypair,
      userKeypair
    );

    const result = await client.verifyPaymentMandate({
      closedPaymentMandatePresentation: closedPresentation,
      userJwk: secp256r1PublicKeyToJwk(otherKeypair.publicKey()),
      paymentExpectedNonce: PAYMENT_NONCE,
      openPaymentMandatePresentation: openPresentation,
    });

    expect(result.paymentMandateVerified).toBe(false);
    expect(result.paymentMandateError).toBeDefined();
  });

  it("fails verification when the nonce does not match", async () => {
    const agentKeypair = Secp256r1Keypair.random();
    const userKeypair = Secp256r1Keypair.random();
    const { openPresentation, closedPresentation } = await buildClosedPaymentMandatePresentation(
      agentKeypair,
      userKeypair
    );

    const result = await client.verifyPaymentMandate({
      closedPaymentMandatePresentation: closedPresentation,
      userJwk: secp256r1PublicKeyToJwk(userKeypair.publicKey()),
      paymentExpectedNonce: "wrong-nonce",
      openPaymentMandatePresentation: openPresentation,
    });

    expect(result.paymentMandateVerified).toBe(false);
    expect(result.paymentMandateError).toBeDefined();
  });

  it("issues an unsigned Payment Receipt on successful verification", async () => {
    const agentKeypair = Secp256r1Keypair.random();
    const userKeypair = Secp256r1Keypair.random();
    const openCheckoutPresentation = await buildOpenCheckoutMandatePresentation(userKeypair);
    const conditionalTransactionId = computeSdHash(parseSdJwtPresentation(openCheckoutPresentation));
    const { openPresentation, closedPresentation } = await buildClosedPaymentMandatePresentation(
      agentKeypair,
      userKeypair,
      conditionalTransactionId
    );

    const result = await client.issuePaymentToken({
      closedPaymentMandatePresentation: closedPresentation,
      userJwk: secp256r1PublicKeyToJwk(userKeypair.publicKey()),
      paymentExpectedNonce: PAYMENT_NONCE,
      checkoutJwt: CHECKOUT_JWT,
      openPaymentMandatePresentation: openPresentation,
      openCheckoutMandatePresentation: openCheckoutPresentation,
      issuer: "mpp.acme",
      paymentId: "PAY-001",
    });

    expect(result.verification.paymentMandateVerified).toBe(true);
    expect(result.verification.transactionIdVerified).toBe(true);
    expect(result.verification.sdHashVerified).toBe(true);
    expect(result.verification.referenceVerified).toBe(true);
    expect(result.signed).toBe(false);
    expect(result.receipt).toMatchObject({
      status: "Success",
      iss: "mpp.acme",
      payment_id: "PAY-001",
    });
  });

  it("does not issue a receipt when checkout/reference binding fields are omitted, even if the signature verifies", async () => {
    const agentKeypair = Secp256r1Keypair.random();
    const userKeypair = Secp256r1Keypair.random();
    const { openPresentation, closedPresentation } = await buildClosedPaymentMandatePresentation(
      agentKeypair,
      userKeypair
    );

    const result = await client.issuePaymentToken({
      closedPaymentMandatePresentation: closedPresentation,
      userJwk: secp256r1PublicKeyToJwk(userKeypair.publicKey()),
      paymentExpectedNonce: PAYMENT_NONCE,
      openPaymentMandatePresentation: openPresentation,
      issuer: "mpp.acme",
      paymentId: "PAY-003",
    });

    expect(result.verification.paymentMandateVerified).toBe(true);
    expect(result.verification.transactionIdVerified).toBeUndefined();
    expect(result.verification.referenceVerified).toBeUndefined();
    expect(result.signed).toBe(false);
    expect(result.receipt).toBeUndefined();
  });

  it("does not issue a receipt when verification fails", async () => {
    const agentKeypair = Secp256r1Keypair.random();
    const userKeypair = Secp256r1Keypair.random();
    const otherKeypair = Secp256r1Keypair.random();
    const { openPresentation, closedPresentation } = await buildClosedPaymentMandatePresentation(
      agentKeypair,
      userKeypair
    );

    const result = await client.issuePaymentToken({
      closedPaymentMandatePresentation: closedPresentation,
      userJwk: secp256r1PublicKeyToJwk(otherKeypair.publicKey()),
      paymentExpectedNonce: PAYMENT_NONCE,
      openPaymentMandatePresentation: openPresentation,
      issuer: "mpp.acme",
      paymentId: "PAY-001",
    });

    expect(result.verification.paymentMandateVerified).toBe(false);
    expect(result.receipt).toBeUndefined();
  });
});
