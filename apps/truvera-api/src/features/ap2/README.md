# AP2 (Agent Payments Protocol) Integration — Credential Provider role

This directory contains AP2 v0.2 support for the Truvera MCP server. AP2 is
an open protocol for secure agent-to-agent payment authorization using
SD-JWT mandates.

- **Specification**: https://ap2-protocol.org/ap2/specification/
- **Repository**: https://github.com/google-agentic-commerce/AP2

## Role

Per the spec, mandates (Open/Closed Checkout and Payment) are **self-signed**
by the user and Shopping Agent — not issued by a third party. Issuance lives
in `wallet-server`'s own `ap2` feature (`create_ap2_signing_key`,
`issue_open_checkout_mandate`, `issue_closed_checkout_mandate`,
`issue_open_payment_mandate`, `issue_closed_payment_mandate`), since it holds
the signing keys.

`truvera-api` plays the spec's **Credential Provider** role: verify a Closed
Payment Mandate and return a Payment Receipt.

## Available MCP Tools

### `verify_payment_mandate`

Verifies a Closed Payment Mandate: the Open Payment Mandate's issuer
signature against the supplied `userJwk`, the Shopping Agent's `cnf.jwk`
signature on the Closed Mandate (derived from the Open Mandate itself, never
from a caller-supplied key), `aud`/expiry/`nonce`, `transaction_id` against a
provided `checkoutJwt`, and `sd_hash` against the referenced Open Payment
Mandate presentation. Optionally also verifies the paired Closed Checkout
Mandate.

**Required:** `closedPaymentMandatePresentation`, `userJwk` (the User's own
public key — the key that signed the Open Payment/Checkout Mandate(s),
independently resolved/trusted by the caller, e.g. via DID resolution or a
wallet registry), `paymentExpectedNonce` (this Credential Provider's own
single-use nonce for the transaction)

**Optional:** `checkoutJwt`, `openPaymentMandatePresentation`,
`closedCheckoutMandatePresentation`, `openCheckoutMandatePresentation`,
`checkoutExpectedNonce` (required if `closedCheckoutMandatePresentation` is
supplied)

When both `openPaymentMandatePresentation` and `openCheckoutMandatePresentation`
are supplied, the Open Payment Mandate's `payment.reference` constraint
(`conditional_transaction_id`) is verified against a fresh `sd_hash` of the
Open Checkout Mandate — a mismatch fails verification outright, not just the
`referenceVerified` flag. See `@docknetwork/ap2`'s `verifyClosedPaymentMandate`
docs for the full set of checks.

### `issue_payment_token`

Runs `verify_payment_mandate` and, on success, returns an AP2 Payment
Receipt (`status`, `iss`, `iat`, `reference`, `payment_id`,
`psp_confirmation_id`, `network_confirmation_id`).

**Additional required:** `issuer`, `paymentId`

**Known limitation:** the returned receipt is **not yet cryptographically
signed** — see the result's `signed: false` field. Real signing needs a
Truvera-managed processor key exposed as a raw-signing capability, which
isn't wired up yet. The unsigned receipt content is still returned so
callers have the correct shape to act on once that's available.

## Configuration

```bash
# Set to false to disable AP2 support (both tools above)
AP2_ENABLED=true
```

## Architecture

```
ap2/
├── types.ts   # Request/result types for both tools
├── schemas.ts # JSON schemas for tool inputs
├── client.ts  # Wraps @docknetwork/ap2's verify functions + Payment Receipt building
├── tools.ts   # MCP tool definitions and handlers
├── index.ts   # Module exports
└── tests/
```

## Resources

- [AP2 Protocol Specification](https://ap2-protocol.org/ap2/specification/)
- [AP2 Checkout Mandate](https://ap2-protocol.org/ap2/checkout_mandate/)
- [AP2 Payment Mandate](https://ap2-protocol.org/ap2/payment_mandate/)
- [@docknetwork/ap2](https://github.com/docknetwork/sdk/tree/main/packages/ap2) — mandate/receipt build, sign, and verify functions used here
