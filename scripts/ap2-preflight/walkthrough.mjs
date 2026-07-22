// Pre-flight sanity check for the AP2 example app: drives the full mandate
// lifecycle by hand against live HTTP MCP servers, exactly as the example
// app's Shopping Agent will, before any LLM is in the loop. Prints every
// request/response so real payloads can be used as fixtures, and exits
// non-zero if verification doesn't come back true.
//
// Prerequisites (see AP2-EXAMPLE-APP-HANDOFF.md Part 1 item 5 for why):
//   - Node 24.x (not 25.x -- minimal-cipher's web-streams-polyfill import
//     hits ERR_UNSUPPORTED_DIR_IMPORT on 25).
//   - wallet-server running: MCP_MODE=http WALLET_DB_PATH=<writable path>
//     DID_CACHE_PATH=<writable path> npm start (from apps/wallet-server),
//     default port 3010 per this repo's local .env.
//   - truvera-api running: MCP_MODE=http npm run dev (from apps/truvera-api),
//     default port 3000.
//   - If wallet-sdk is file:-linked (not yet released), its own
//     node_modules needs the same @digitalbazaar/{minimal-cipher,
//     did-method-key,did-io} patches this repo already carries in
//     apps/wallet-server/patches/ -- see the handoff doc for specifics.
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import * as jose from "jose";
import { computeSdHash, parseSdJwtPresentation } from "@docknetwork/crypto-utils/vc";

function log(label, obj) {
  console.log(`\n=== ${label} ===`);
  console.log(JSON.stringify(obj, null, 2));
}

async function callTool(client, name, args) {
  const result = await client.callTool({ name, arguments: args });
  if (result.isError) {
    throw new Error(`${name} failed: ${JSON.stringify(result.content)}`);
  }
  const text = result.content?.find((c) => c.type === "text")?.text;
  return text ? JSON.parse(text) : result;
}

async function connect(url, name) {
  const transport = new StreamableHTTPClientTransport(new URL(url));
  const client = new Client({ name, version: "0.0.0" }, { capabilities: {} });
  await client.connect(transport);
  return client;
}

const wallet = await connect("http://localhost:3010/mcp", "preflight-wallet-client");
const credProvider = await connect("http://localhost:3000/mcp", "preflight-credprovider-client");

// --- Step 0: identities ---
const userDid = await callTool(wallet, "create_did", {});
log("0a. create_did (User)", userDid);
const userKey = await callTool(wallet, "create_ap2_signing_key", { controller: userDid.did });
log("0b. create_ap2_signing_key (User)", userKey);

const agentDid = await callTool(wallet, "create_did", {});
log("0c. create_did (Shopping Agent)", agentDid);
const agentKey = await callTool(wallet, "create_ap2_signing_key", { controller: agentDid.did });
log("0d. create_ap2_signing_key (Agent)", agentKey);

// --- Step 1: Open Checkout Mandate (User) ---
const openCheckout = await callTool(wallet, "issue_open_checkout_mandate", {
  keyId: userKey.keyId,
  publicJwk: userKey.publicJwk,
  constraints: [
    {
      type: "checkout.line_items",
      items: [{ id: "sku-widget-1", quantity: 2, acceptable_items: [{ id: "sku-widget-1", title: "Widget" }] }],
    },
    {
      type: "checkout.allowed_merchants",
      allowed: [{ id: "merchant-acme", name: "Acme Shop", website: "https://acme.example" }],
    },
  ],
});
log("1. issue_open_checkout_mandate", openCheckout);

// --- Step 2: Merchant mock issues a self-signed Checkout JWT (opaque to @docknetwork/ap2) ---
const merchantKeyPair = await jose.generateKeyPair("ES256");
const checkoutJwt = await new jose.SignJWT({
  cart: { items: [{ id: "sku-widget-1", quantity: 2, unitPrice: 25, currency: "USD" }] },
  total: { amount: 50, currency: "USD" },
})
  .setProtectedHeader({ alg: "ES256" })
  .setIssuer("merchant-acme")
  .setIssuedAt()
  .sign(merchantKeyPair.privateKey);
log("2. Merchant-issued Checkout JWT", { checkoutJwt });

// --- Step 3: Agent closes the Checkout Mandate ---
const closedCheckout = await callTool(wallet, "issue_closed_checkout_mandate", {
  keyId: agentKey.keyId,
  checkoutJwt,
  nonce: "preflight-nonce-1",
  openMandatePresentation: openCheckout.presentation,
});
log("3. issue_closed_checkout_mandate", closedCheckout);

// --- Step 4: Open Payment Mandate (User), budget constraint ---
// conditional_transaction_id is the sd_hash of the OPEN checkout mandate
// presentation (per @docknetwork/ap2's own test suite), not the closed
// mandate's checkout_hash.
const conditionalTransactionId = computeSdHash(parseSdJwtPresentation(openCheckout.presentation));
const BUDGET_MINOR_UNITS = 10000; // $100.00, ISO-4217 minor units per schema
const openPayment = await callTool(wallet, "issue_open_payment_mandate", {
  keyId: userKey.keyId,
  publicJwk: userKey.publicJwk,
  constraints: [
    { type: "payment.budget", max: BUDGET_MINOR_UNITS, currency: "USD" },
    { type: "payment.reference", conditional_transaction_id: conditionalTransactionId },
  ],
});
log("4. issue_open_payment_mandate", openPayment);

// --- Step 5: Agent checks total against budget, then closes Payment Mandate ---
const CART_TOTAL_MINOR_UNITS = 5000; // $50.00
console.log(
  `\n[Agent decision] cart total $${CART_TOTAL_MINOR_UNITS / 100} <= budget $${BUDGET_MINOR_UNITS / 100}? ${
    CART_TOTAL_MINOR_UNITS <= BUDGET_MINOR_UNITS ? "YES, proceeding" : "NO, would reject"
  }`
);

const closedPayment = await callTool(wallet, "issue_closed_payment_mandate", {
  keyId: agentKey.keyId,
  checkoutJwt,
  payee: { id: "merchant-acme", name: "Acme Shop", website: "https://acme.example" },
  paymentAmount: { amount: CART_TOTAL_MINOR_UNITS, currency: "USD" },
  paymentInstrument: { id: "instr-1", type: "card", description: "demo card" },
  nonce: "preflight-nonce-2",
  openMandatePresentation: openPayment.presentation,
});
log("5. issue_closed_payment_mandate", closedPayment);

// --- Step 6: Credential Provider verifies + issues payment token ---
// holderJwk verifies the presentation's outer JWS signature, which is made
// by the Shopping Agent's key (Closed mandates are agent-signed), not the
// User's -- the User's key only appears inside the Open mandate's `cnf`.
const paymentToken = await callTool(credProvider, "issue_payment_token", {
  closedPaymentMandatePresentation: closedPayment.presentation,
  holderJwk: agentKey.publicJwk,
  checkoutJwt,
  openPaymentMandatePresentation: openPayment.presentation,
  closedCheckoutMandatePresentation: closedCheckout.presentation,
  openCheckoutMandatePresentation: openCheckout.presentation,
  issuer: "credential-provider-demo",
  paymentId: "pay-preflight-1",
});
log("6. issue_payment_token", paymentToken);

const v = paymentToken.verification;
const checks = {
  paymentMandateVerified: v.paymentMandateVerified,
  checkoutMandateVerified: v.checkoutMandateVerified,
  transactionIdVerified: v.transactionIdVerified,
  sdHashVerified: v.sdHashVerified,
};
const failed = Object.entries(checks).filter(([, ok]) => ok !== true);
if (failed.length > 0) {
  console.error("\nFAILED verification checks:", failed);
  process.exit(1);
}
console.log("\nAll verification checks passed:", checks);

// --- Step 7: Merchant/PSP mock would sign the real Payment Receipt here ---
// (truvera-api's issue_payment_token never signs it -- confirmed by design,
// `paymentToken.signed === false`. Building/signing the receipt is
// @docknetwork/ap2's buildPaymentReceipt/issuePaymentReceipt, which the
// example app's own Merchant/PSP mock will call directly -- deferred here
// since this script's goal was validating the MCP tool surface end-to-end,
// not re-implementing the signer plumbing.)
console.log(`\n[truvera-api receipt] signed=${paymentToken.signed} (expected false, per design)`);
console.log("\nDone. All 6 MCP-tool-driven protocol steps verified end-to-end against live HTTP servers.");

process.exit(0);
