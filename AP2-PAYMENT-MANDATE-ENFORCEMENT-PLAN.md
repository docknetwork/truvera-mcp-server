# AP2 payment mandate server-side enforcement — implementation plan

> **Status: implemented**, with two corrections found during implementation
> (see "What changed from this plan" at the end). Kept as-written above that
> section for the historical record of the original design.

## Motivation

`ap2-example-app`'s Shopping Agent is now driven by an LLM (Ollama or Anthropic,
selectable) that is *supposed* to follow a strict tool-call sequence: check the
cart total against the user's stated budget before calling
`issue_closed_payment_mandate`, only pay the authorized merchant, only use the
authorized payment instrument. That app added its own client-side enforcement
layer (`src/lib/agent/enforcement.ts`) that rejects tool calls violating these
rules before they ever reach this server — because **this server currently
enforces none of it itself**.

That's fine for a demo with one trusted caller, but it means:
- Any other MCP client calling `wallet-server` directly gets zero protection.
- The budget/payee/instrument constraints declared in the Open Payment Mandate
  are purely advisory today — nothing checks a Closed Payment Mandate actually
  honors them before it gets signed.

This plan adds that enforcement here, in `AP2Client`, so it holds regardless of
which caller or which LLM is driving the flow.

## Scope

**In scope** (checkable today with data already passed into the existing tool
calls, no protocol/API changes):
1. `paymentAmount` (on `issue_closed_payment_mandate`) must not exceed the
   `payment.budget.max`/`currency` constraint from the Open Payment Mandate.
2. `payee` must be present in `payment.allowed_payees`, if that constraint is
   present on the Open Payment Mandate (it's optional per schema).
3. `paymentInstrument` must be present in `payment.allowed_payment_instruments`,
   if present.

**Out of scope for this plan** (needs an API/schema change or new
infrastructure — tracked as follow-ups below, not designed in detail here):
4. Binding `payment.reference.conditional_transaction_id` to the actual
   checkout delegate chain — `issue_closed_payment_mandate` doesn't currently
   receive the checkout side of the transaction at all, so there's nothing to
   bind against yet. `truvera-api`'s own README already documents this same gap
   for `verify_payment_mandate`.
5. Correlating the closing `keyId` against the Open Payment Mandate's
   `cnf.jwk` (confirming the same holder that received the budget is the one
   closing it) — `IDIDProvider` has no `keyId -> publicJwk` lookup today (see
   Decision below).

## Where this goes

`apps/wallet-server/src/features/ap2/client.ts`, in
`AP2Client.issueClosedPaymentMandate` (currently ~line 102-117), **before**
calling `signClosedPaymentMandate`. This is the single choke point every
Closed Payment Mandate passes through regardless of caller.

## Design

### Step 1 — decode the Open Payment Mandate's content, not just its hash

Today `params.openMandatePresentation` is only used to compute `sd_hash`
(`@docknetwork/ap2`'s `signClosedPaymentMandate`, `mandates.js:359-362`) — its
actual `constraints` are never decoded. Enforcement needs:

```ts
import { parseSdJwtPresentation, decodeJwtPayload } from "@docknetwork/crypto-utils/vc";
// + whatever resolves SD disclosures against the digest-referenced content --
// see "Decision: reuse vs. reimplement resolveMandateContent" below.
```

Resulting shape (confirmed against `payment-mandate-open.json`):
```ts
interface OpenPaymentMandateContent {
  vct: "mandate.payment.open.1";
  constraints: Array<
    | { type: "payment.budget"; max: number; currency: string }
    | { type: "payment.allowed_payees"; allowed: Array<{ id: string; name: string; website?: string }> }
    | { type: "payment.allowed_payment_instruments"; allowed: Array<{ id: string; type: string; description?: string }> }
    | { type: "payment.reference"; conditional_transaction_id: string }
    // ...other constraint types, irrelevant to this check
  >;
  cnf: { jwk: { kty: string; crv: string; x: string; y: string } };
  exp?: number;
}
```

Note `payment.allowed_payees`/`payment.allowed_payment_instruments` entries are
individually SD-redacted (`redactPaymentConstraints`, `mandates.js:162-174`) --
each `allowed[i]` starts as `{"...": digest}` and needs its own disclosure
resolved, same mechanism as the top-level content.

### Step 2 — verify before trusting

Do not extract `constraints` from an unverified presentation — a caller could
otherwise pass a hand-edited presentation with a permissive fake budget. At
minimum, before reading `constraints`:
- Verify the presentation's signature (`verifyJWT` from
  `@docknetwork/crypto-utils/vc`, against whichever public key issued it --
  this is the User's key, already known to wallet-server since it issued the
  Open Payment Mandate for that User).
- Check `exp` against the current time (mirroring, but not calling, the
  private `checkNotExpired` in `mandates.js:407` -- see Decision below).

### Step 3 — the actual checks, in `issueClosedPaymentMandate`

```ts
const content = resolveOpenPaymentMandateContent(params.openMandatePresentation); // see Decision below for how

const budget = content.constraints.find(c => c.type === "payment.budget");
if (budget && (params.paymentAmount.amount > budget.max || params.paymentAmount.currency !== budget.currency)) {
  throw new Error(
    `paymentAmount (${params.paymentAmount.amount} ${params.paymentAmount.currency}) exceeds payment.budget constraint (${budget.max} ${budget.currency})`
  );
}

const allowedPayees = content.constraints.find(c => c.type === "payment.allowed_payees");
if (allowedPayees && !allowedPayees.allowed.some(p => p.id === params.payee.id)) {
  throw new Error(`payee "${params.payee.id}" is not in the Open Payment Mandate's payment.allowed_payees`);
}

const allowedInstruments = content.constraints.find(c => c.type === "payment.allowed_payment_instruments");
if (allowedInstruments && !allowedInstruments.allowed.some(i => i.id === params.paymentInstrument.id)) {
  throw new Error(`paymentInstrument "${params.paymentInstrument.id}" is not in the Open Payment Mandate's payment.allowed_payment_instruments`);
}
```

Throwing a plain `Error` here is sufficient and idiomatic — `tools.ts`'s
existing generic `try/catch` → `errorResult()` (`tools.ts:29-43`) already turns
any thrown error into `{success: false, error: <message>, isError: true}` with
no changes needed to that plumbing. This matches how
`signClosedPaymentMandate` itself already throws a plain `TypeError` for a
missing `openMandatePresentation` (`mandates.js:353-355`).

Note `payment.budget` and the allow-list constraints are all **optional** per
schema — only `payment.reference` is required (`contains` in the ajv schema).
So each check above is conditional on the constraint actually being present;
an Open Payment Mandate with no budget constraint imposes no budget ceiling
(that's a protocol-level modeling choice, not something this plan changes).

## Decision: reuse vs. reimplement mandate-content resolution

`@docknetwork/ap2`'s `mandates.js` has everything needed
(`resolveMandateContent`, `checkNotExpired`) but only exposes them bundled
inside `verifyClosedCheckoutMandate`/`verifyClosedPaymentMandate` — there is no
`verifyOpenPaymentMandate` export, and `resolveMandateContent`/
`checkNotExpired` are not exported from `mandates.js` or re-exported from
`@docknetwork/ap2`'s `index.js`.

Two options, pick one before starting Step 1:

- **(a) Add `verifyOpenPaymentMandate`/`resolveOpenPaymentMandateContent` to
  `@docknetwork/ap2`** (`sdk/packages/ap2`), exporting the same
  verify-signature + resolve-disclosures + check-expiry pipeline the Closed
  verifiers already use, parameterized for the Open mandate's simpler
  structure (no `holderJwk`/`checkoutJwt` cross-checks needed, just signature +
  expiry + disclosure resolution). This is the cleaner fix — `ap2-example-app`
  or any other consumer needing to inspect an Open mandate's constraints
  benefits too — but touches the shared SDK package, which is more surface
  area to review/release than a wallet-server-only change.
- **(b) Reimplement the minimal subset locally in `wallet-server`**
  (`apps/wallet-server/src/features/ap2/`), duplicating just enough of
  `resolveMandateContent`'s digest-resolution logic to read `constraints` and
  `cnf` back out. Faster to ship, but duplicates logic that already exists
  once in the SDK and will drift if `mandates.js`'s resolution logic changes.

**Recommendation: (a).** This exact need (verify + read an Open mandate's own
content) is generic enough that it belongs in the SDK, not copy-pasted into
each MCP server that might want it — and `ap2-example-app`'s own enforcement
layer would eventually want the same primitive if it ever needs to read
constraints itself rather than tracking them from tool outputs as it does
today.

## What this plan deliberately doesn't decide

- **Follow-up: `keyId` ↔ `cnf.jwk` correlation** (item 5 above). Confirmed
  `IDIDProvider` (`@docknetwork/wallet-sdk-core`) has no `keyId -> publicJwk`
  lookup — only `createSigningKey` (returns the public key once, at creation)
  and `signWithKeyId` (signs, doesn't expose the key). Closing this gap needs
  either a new `IDIDProvider.getPublicKey(keyId)` method, or requiring
  `issue_closed_payment_mandate`'s request schema to carry `publicJwk`
  alongside `keyId` (mirroring `issue_open_payment_mandate`'s existing shape)
  so `AP2Client` can compare without a wallet-store lookup. Worth a separate,
  smaller plan once (a) above lands, since it's an orthogonal check (identity
  binding, not amount/payee/instrument enforcement).
- **Follow-up: `payment.reference` / delegate-chain binding** (item 4 above).
  Needs `issue_closed_payment_mandate` to receive the checkout-side
  presentation as well, which is a request-schema change with its own
  backward-compatibility question (existing callers, including
  `ap2-example-app`, don't pass it today). Separate plan.

## Test plan

Add to `apps/wallet-server/src/features/ap2/tests/unit/ap2-client.test.ts`
(existing coverage of `issueOpenPaymentMandate`/`issueClosedPaymentMandate`
with a fake `IDIDProvider` and real crypto):
- `paymentAmount` over `payment.budget.max` → `issueClosedPaymentMandate`
  rejects, doesn't call `signClosedPaymentMandate`.
- `paymentAmount.currency` mismatching the budget constraint's `currency` →
  rejects.
- `payee.id` not in `payment.allowed_payees` (when that constraint is present)
  → rejects; when the constraint is absent, any payee is accepted (no
  regression for mandates that don't declare an allow-list).
- Same two cases for `paymentInstrument` / `payment.allowed_payment_instruments`.
- A within-budget, allowed-payee, allowed-instrument call still succeeds and
  produces a verifiable Closed Payment Mandate (regression guard).

Add to `apps/wallet-server/src/features/ap2/tests/unit/ap2-tools.test.ts`
(existing coverage of the MCP tool wire format with a mocked `AP2Client`):
- A rejected `issue_closed_payment_mandate` call surfaces as
  `{isError: true, content: [...]}` with the thrown message in
  `error`, exercising the existing `errorResult()` path with no plumbing
  changes.

## Rollout

No schema/wire-format changes to `issue_closed_payment_mandate`'s request or
response shape — this only adds new rejection paths for calls that were
already violating the mandate's own declared constraints. Existing well-formed
callers (including `ap2-example-app`, whose demo cart is always within budget)
see no behavior change. Ship as a normal PR against `wallet-server` (plus the
SDK PR for option (a) above, landed first since `wallet-server` will depend on
it).

## What changed from this plan, during implementation

Two things in the plan above turned out not to hold once checked against the
actual code (`sdk/packages/ap2/src/mandates.js`, `client.ts`'s own header
comment, and the existing round-trip test in
`sdk/packages/ap2/tests/mandates.test.js`):

1. **Step 2's signature-verification premise was wrong.** The plan assumed
   the Open Payment Mandate's signing key is "the User's key, already known
   to wallet-server." It isn't known anywhere in this codebase — `client.ts`
   itself says "Mandates are self-signed per the AP2 spec," but concretely,
   the Open Mandate is signed by the caller-supplied `keyId` (the User's key)
   while its own `cnf.jwk` names a *different* key (the Agent's, endorsed to
   close it later) — confirmed by the SDK's own round-trip test, which signs
   with `userKeypair` and embeds `agentKeypair`'s JWK as `cnf`. There is no
   mechanism anywhere in this system (no `IDIDProvider.getPublicKey`, no
   persisted issuance record) for `wallet-server` to independently know the
   User's public key at closing time. So the shipped `resolveOpenPaymentMandateContent`
   (in `@docknetwork/ap2`) deliberately does **not** verify an issuer
   signature — it only checks SD-JWT digest/disclosure consistency, schema
   shape, and `exp`. Real signature-based protection instead comes from item
   2 below, applied to the *Closed* mandate instead.

2. **The `keyId`↔`cnf.jwk` binding (originally item 5, deferred as an
   orthogonal follow-up) was folded into this same change, cheaply.** Rather
   than adding `IDIDProvider.getPublicKey` or a new `publicJwk` parameter on
   `issue_closed_payment_mandate` (the two options this plan posed), the
   shipped code reuses the already-exported, already-tested
   `verifyClosedPaymentMandate`: after signing the Closed Payment Mandate, it
   re-verifies that same presentation with `holderJwk: openContent.cnf.jwk`
   and rejects if it doesn't verify. This confirms the actual signing key
   behind `params.keyId` matches the key the Open Mandate named as its
   closer — no SDK/IDIDProvider changes needed for this part.

**Residual limitation, correctly scoped now:** neither check — nor any
crypto check addable inside `AP2Client` alone — defends against a single
caller that can freely invoke both `issue_open_payment_mandate` and
`issue_closed_payment_mandate` end to end (nothing today distinguishes those
two tools' callers). Such a caller can self-issue a permissive Open Mandate
naming its own key as `cnf.jwk`, satisfying every check here. What this
change *does* defend against: (a) a legitimate Open Mandate later being
closed by a different, unauthorized key (`cnf.jwk` mismatch — the hijack
case), and (b) a compromised or buggy caller mid-session violating budget/
payee/instrument constraints it (or the flow around it) already committed to
earlier. Closing the first residual gap requires actual access-control /
provenance tracking (e.g., which principal is allowed to call
`issue_open_payment_mandate`, or a persisted issuance ledger) — a bigger,
separate piece of work, not a crypto-only fix.

Implementation also added `payment.amount_range` enforcement alongside
`payment.budget` (not in the original plan) — the Open Payment Mandate schema
defines both as valid ways to bound a payment amount, and the SDK's own
round-trip test uses `payment.amount_range` for exactly this purpose even
though `ap2-example-app` uses `payment.budget`. Enforcing both, when present,
closes a gap the original plan would have missed for any caller using the
other convention.
