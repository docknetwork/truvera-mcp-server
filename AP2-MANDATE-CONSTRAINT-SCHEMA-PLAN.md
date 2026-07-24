# Simplifying the Open Mandate `constraints` schema — plan

> **Status: implemented (both Option A and Option B).** One correction found
> during implementation: `inputSchema` is not actually enforced at runtime
> anywhere in this codebase (confirmed by reading `packages/mcp-shared`'s
> request-handling code — `createCallToolHandler` invokes the handler with
> raw, unvalidated `args`; only `@docknetwork/ap2`'s `buildOpen*Mandate`
> validates, downstream, against the *protocol* schema, not this tool's
> `inputSchema`). So Option A's tightened schema is exactly as valuable as
> this plan says for guiding a tool-calling model, but it does not itself add
> a new rejection path — nothing changes with respect to actual enforcement,
> which still happens only inside `@docknetwork/ap2`. Kept as-written below
> for the historical record; implementation details below the original
> content.

## Motivation

While building `ap2-example-app`'s Shopping Agent against several small
local LLMs (via Ollama) as an alternative to Anthropic's API, `issue_open_checkout_mandate`
turned out to be the actual bottleneck of the whole flow — not model size or
prompting in general. Across every model and setting tried (five different
models; context window, temperature, and max-tokens all tuned; a worked
few-shot example added), **no run ever successfully constructed this tool's
`constraints` argument correctly.** Models either guessed a plausible-but-wrong
field name, or stalled mid-turn second-guessing the shape without ever making
the call.

This isn't really a model-capability problem. It's a schema problem: the
tool's own input schema doesn't describe the shape it expects.

## Root cause

`issueOpenCheckoutMandateSchema` and `issueOpenPaymentMandateSchema`
(`apps/wallet-server/src/features/ap2/schemas.ts:39` and `:79`) both reuse the
same generic `constraintsSchema` (`schemas.ts:17-26`):

```ts
const constraintsSchema = {
  type: "array" as const,
  description: "AP2 constraint objects (e.g. checkout.line_items, checkout.allowed_merchants, payment.amount_range, payment.allowed_payees, payment.reference). Each must have a 'type' field; other properties depend on the constraint type.",
  items: {
    type: "object" as const,
    properties: { type: { type: "string" } },
    required: ["type"],
    additionalProperties: true,
  },
};
```

This only guarantees each array entry has a `type: string` field.
**Every other field's name and shape is described in prose, not in a
machine-checkable schema** — there's nothing here telling a caller that
`checkout.line_items` needs an `items` array vs. `checkout.allowed_merchants`
needing an `allowed` array, for example. The matching TypeScript type
(`MandateConstraint`, `types.ts:22-25`) is exactly as loose:

```ts
export interface MandateConstraint {
  type: string;
  [key: string]: unknown;
}
```

A model (or any caller) has to reconstruct the correct per-type shape purely
from memory of the AP2 spec or from instructions given elsewhere (a system
prompt, docs) — there's no structural scaffolding at the one place a
tool-calling model actually looks: the tool's own schema. Larger models can
often paper over this from training knowledge; smaller ones can't, and we
watched that gap play out directly (wrong key names, invented nested shapes,
stalling).

## What this does NOT touch

Nothing here changes the AP2 protocol, the mandate content that gets signed,
or interop with other AP2 implementations. `client.ts`'s handlers pass
`params.constraints` straight through to `buildOpenCheckoutMandate`/
`buildOpenPaymentMandate` (`client.ts:62-67`, `:90-95`) unchanged — every
option below only changes what a *caller* has to construct before that same
internal call happens. The signed content is byte-for-byte identical either
way.

## Option A — tighten the existing schema (smallest change, do this regardless)

Replace the generic `constraintsSchema` with a proper discriminated union,
keyed on `type`, using JSON Schema's `oneOf` + `const`. No handler code
changes at all — `client.ts` already accepts `MandateConstraint[]` and passes
it straight through; this only makes the schema honest about the shape it
was always expecting.

```ts
const lineItemsConstraintSchema = {
  type: "object" as const,
  properties: {
    type: { const: "checkout.line_items" },
    items: {
      type: "array" as const,
      items: {
        type: "object" as const,
        properties: { id: { type: "string" }, quantity: { type: "integer" } },
        required: ["id", "quantity"],
      },
    },
  },
  required: ["type", "items"],
};

const allowedMerchantsConstraintSchema = {
  type: "object" as const,
  properties: {
    type: { const: "checkout.allowed_merchants" },
    allowed: {
      type: "array" as const,
      items: {
        type: "object" as const,
        properties: { id: { type: "string" }, name: { type: "string" }, website: { type: "string" } },
        required: ["id", "name"],
      },
    },
  },
  required: ["type", "allowed"],
};

const checkoutConstraintsSchema = {
  type: "array" as const,
  items: { oneOf: [lineItemsConstraintSchema, allowedMerchantsConstraintSchema] },
};
```

`issue_open_payment_mandate` would get the equivalent treatment for its own
constraint types (`payment.budget`, `payment.allowed_payees`,
`payment.allowed_payment_instruments`, `payment.reference`,
`payment.amount_range`, `payment.agent_recurrence`, `payment.execution_date`
— shapes per `sdk/packages/ap2/src/schemas/payment-mandate-open.json`), as a
separate, larger `oneOf`.

This alone should measurably help any tool-calling model, not just small
ones — the exact field name per constraint type becomes enforceable, not
just described in prose.

## Option B — promote the common case to named parameters (bigger, more model-friendly)

Checkout mandates realistically always need exactly the same two constraint
types. Rather than asking a caller to construct a polymorphic array at all,
expose them directly and assemble the internal array server-side:

```ts
export interface IssueOpenCheckoutMandateRequest {
  keyId: string;
  publicJwk: P256Jwk;
  lineItems: Array<{ id: string; quantity: number }>;
  allowedMerchants: Array<{ id: string; name: string; website?: string }>;
  additionalConstraints?: MandateConstraint[]; // escape hatch, unchanged shape, for anything not yet promoted
  exp?: number;
}
```

`client.ts`'s `issueOpenCheckoutMandate` would assemble
`[{type: "checkout.line_items", items: params.lineItems}, {type: "checkout.allowed_merchants", allowed: params.allowedMerchants}, ...(params.additionalConstraints ?? [])]`
and pass that into the same, unchanged `buildOpenCheckoutMandate` call
(`client.ts:62`). One small mapping function; zero changes to
`@docknetwork/ap2`'s builder or anything downstream.

`issue_open_payment_mandate` has more constraint types in real use, so its
named-parameter surface would be larger (`budget?`, `allowedPayees?`,
`allowedPaymentInstruments?`, `reference` — required, since the schema's own
`contains` rule already mandates at least one `payment.reference` entry —
plus `amountRange?`, `agentRecurrence?`, `executionDate?`), but the same
pattern applies directly.

**Recommendation: do Option A unconditionally (it's strictly more correct for
free), and Option B if a model-friendly caller surface is a real goal** —
Option B is the one I'd actually expect to fix what we observed, since the
model no longer has to remember a type-to-field mapping at all.

## Backward compatibility

Existing callers may already depend on the current `constraints: MandateConstraint[]`
shape.

- Option A is schema-only and non-breaking — the same array shape is still
  accepted, just validated more precisely. Any caller already sending correct
  constraints continues to work; only a caller sending a wrong shape (which
  would have produced a broken mandate anyway) now gets a clear rejection
  earlier, at the schema layer, before the AP2 builder throws its own less
  specific error.
- Option B changes the request shape. To stay non-breaking, accept **either**
  the new named fields **or** the legacy `constraints` array (mutually
  exclusive, or merge if both given) rather than removing the old parameter
  outright.

## Test plan

Add to `apps/wallet-server/src/features/ap2/tests/unit/ap2-client.test.ts`
and `.../ap2-tools.test.ts` (existing coverage of
`issueOpenCheckoutMandate`/`issueOpenPaymentMandate` schema shape and
client behavior):

- Option A: a `constraints` entry with an unrecognized `type` value, or a
  recognized `type` missing its required field (e.g. `checkout.line_items`
  without `items`), is rejected at the schema layer rather than reaching
  `buildOpenCheckoutMandate`.
- Option B: `lineItems`/`allowedMerchants` (or their payment-mandate
  equivalents) produce the identical internal `constraints` array and
  identical signed mandate content as the equivalent hand-constructed
  `constraints` array does today (a regression guard that the translation is
  exactly equivalent, not just "close enough").
- Existing tests using the current raw `constraints` array shape should keep
  passing unchanged under both options.

## Rollout

Pairs with `AP2-PAYMENT-MANDATE-ENFORCEMENT-PLAN.md` (server-side budget/
payee/instrument enforcement) — both land in the same
`apps/wallet-server/src/features/ap2/` area and touch the same
`issue_open_checkout_mandate`/`issue_open_payment_mandate` request shapes, so
worth sequencing together rather than as two independent PRs landing out of
order.

## Implementation notes

Both options landed together in `apps/wallet-server/src/features/ap2/`:

- **Option A**: `schemas.ts` replaced the generic `constraintsSchema` with
  per-type discriminated-union schemas (`checkoutConstraintsSchema`,
  `paymentConstraintsSchema`, `oneOf`-keyed on `type`), covering all 2
  checkout and 8 payment constraint types (including `payment.allowed_pisps`,
  not explicitly named in the "Option B" section above but included here for
  completeness via the raw-constraints escape hatch). These are exported and
  covered by direct `ajv`-based tests
  (`tests/unit/ap2-constraints.test.ts`) confirming they accept well-formed
  constraints and reject malformed ones — `ajv` was added as a wallet-server
  devDependency for this (already a transitive dependency via
  `@docknetwork/ap2`, now explicit).
- **Option B**: `types.ts` added named fields (`lineItems`/`allowedMerchants`
  for checkout; `reference`/`budget`/`allowedPayees`/
  `allowedPaymentInstruments`/`amountRange`/`agentRecurrence`/`executionDate`
  for payment), all optional, alongside the now-optional legacy `constraints`
  array and a new `additionalConstraints` escape hatch. `client.ts` gained
  `assembleCheckoutConstraints`/`assemblePaymentConstraints` (exported for
  testability) that merge `constraints` + named fields + `additionalConstraints`,
  in that order, into the same internal array `buildOpen*Mandate` has always
  accepted — verified byte-for-byte equivalent to the hand-built array via
  both direct unit tests and an end-to-end signed-content comparison
  (`resolveOpenPaymentMandateContent` on both paths) in
  `tests/unit/ap2-client.test.ts`.

Backward compatible as designed: `constraints` remains accepted and is
merged rather than replaced, so existing callers passing a raw array see no
behavior change.
