# AP2 example app — handoff

Written to pick this work back up in a fresh session. Two parts: (1) what's
already done and its current state across repos, (2) the plan for the
Next.js example app.

**Status as of 2026-07-23: built and validated end-to-end.** The app lives
at `/home/mparkhill/dock/ap2-example-app` (new standalone repo, 12 commits).
All 9 phases in Part 2 below are done, including Phase 8 (the real
end-to-end run against the live Anthropic API + live MCP servers) — see
that app's own README and commit history for detail. One real bug was
found and fixed only by actually running the agent: `wallet-server` and
`truvera-api` both expose a `create_did` tool (wallet-side vs.
Truvera-account-side), and combining their full tool lists into one
Anthropic request 400s ("Tool names must be unique") — fixed by scoping
each MCP server to an explicit allowlist of the tools this agent's flow
actually calls. After that fix, a live run completed the full mandate
lifecycle with all four Credential Provider verification checks true and
a verified signed Payment Receipt.

## Part 1: What's done — AP2 v0.1 → v0.2 migration + schema dedup

The example app was paused before it started because the MCP tooling only
supported AP2 spec v0.1, which is obsolete. All of the work below was to
bring the stack up to v0.2 first. Verified state as of this handoff:

### `sdk` (`packages/ap2`, `@docknetwork/ap2`) — done, PR open
- Full v0.2 mandate support: build/sign/verify for Open/Closed Checkout
  Mandates and Payment Mandates (`buildOpenCheckoutMandate`,
  `signOpenCheckoutMandate`, `buildClosedCheckoutMandate`,
  `signClosedCheckoutMandate`, `verifyClosedCheckoutMandate`, and the
  Payment Mandate equivalents). Mandates are self-signed SD-JWTs (user key
  for Open, agent key for Closed) — no third-party Issuer DID.
- Mandate JSON Schemas reconciled against Truvera's actually-published
  `schema.truvera.io` content, then further reworked so they're *generated*
  rather than hand-maintained: `upstream-ap2-schemas/` is a pinned mirror of
  the real upstream spec (`google-agentic-commerce/AP2` v0.2.0), and
  `npm run generate-schemas` (`scripts/generate-schemas.mjs`) derives
  `src/schemas/{checkout,payment}-mandate-{open,closed}.json` from it.
- All 6 packaged schemas (4 mandates + the pre-existing checkout/payment
  receipt schemas) are now exported as named exports for external consumers
  (`checkoutMandateOpenSchema`, `checkoutMandateClosedSchema`,
  `paymentMandateOpenSchema`, `paymentMandateClosedSchema`,
  `checkoutReceiptSchema`, `paymentReceiptSchema`).
- Changeset added and consumed (`yarn changeset version`); package is now at
  **0.3.0** on branch `ap2/v0.2-mandates`.
- **Status: committed and pushed. PR open:**
  https://github.com/docknetwork/sdk/pull/611

### `wallet-sdk` — done, not yet pushed
- secp256r1 keypair support added to the wasm layer (`keypairToKeydoc`,
  `keyDocToKeypair`, multicodec constants).
- New DID provider surface for raw signing (not full VC issuance), since AP2
  mandates need a user/agent key to sign arbitrary SD-JWT payloads directly:
  `createSigningKey`, `signWithKeyId` (core), `signWithKeyDoc` (wasm
  service + RPC client).
- **Status: committed locally on branch `ap2/v0.2-secp256r1-signing-keys`.
  Not pushed. No PR yet.**

### `truvera-mcp-server` — done, not yet pushed
- `apps/wallet-server`: new `ap2` feature module — 5 MCP tools covering
  mandate build/sign/verify from the wallet side.
- `apps/truvera-api`: `ap2` feature rewritten for the v0.2 **Credential
  Provider** role — `verify_payment_mandate` and `issue_payment_token`
  tools (replacing the old v0.1 Issuer-role tools).
- Fixed a real regression along the way: `jest.integration.config.cjs` had
  hardcoded stale `node_modules` paths that broke once `wallet-sdk-wasm`
  moved to a `file:` link; now resolved dynamically via `require.resolve`.
- **Status: committed locally on branch `ap2/v0.2-mandate-support`. Not
  pushed. No PR yet.**

### `web` (Truvera's product monorepo) — done, not yet committed
- Removed the 4 AP2 mandate schemas from Workspace's (`apps/certs`)
  issuance/design/clone/verification-request pickers — Workspace signs with
  an org DID, which is incompatible with AP2's self-signed mandate model, so
  a "valid" schema-conformant VC from that flow wouldn't be a real mandate.
  Deleted the 6 now-orphaned schema JSON files.
- Shrunk `scripts/import-ap2-schemas.mjs` to just the two Truvera-specific
  transforms (`ensurePropertyTypes`, `ensureObjectPropertiesPresent`) plus
  the publish/CLI logic; schema content is now sourced directly from
  `@docknetwork/ap2`'s new named exports (added as a root
  `"@docknetwork/ap2": "file:../sdk/packages/ap2"` devDependency). Deleted
  the local `scripts/ap2-schemas/` mirror (superseded by `sdk`'s
  `upstream-ap2-schemas/`).
- Verified via `--dry-run` (no live calls made) that the shrunk script
  produces structurally equivalent payloads to what's actually live.
- **Status: uncommitted on `master`. Nothing pushed, no PR, no live schema
  re-published.**

### Remaining "cascade" steps (not done yet, blocking a fully real environment)
These were flagged mid-migration but not circled back to once the schema-dedup
tangent started:
1. Push `wallet-sdk`'s branch and open a PR.
2. Push `truvera-mcp-server`'s branch and open a PR (currently depends on
   `wallet-sdk` via `file:` links for local dev — decide whether to keep
   that or wait for `wallet-sdk`'s PR to merge/release first).
3. Commit and PR `web`'s changes separately (its own review process).
4. Once `sdk`'s PR (#611) merges and gets released via a GitHub Release
   (triggers `npm-publish.yml` → `yarn changeset publish`), swap any
   `file:` protocol deps elsewhere for real npm version ranges.
5. A manual end-to-end MCP walkthrough via Claude Desktop/stdio was
   flagged earlier as not yet done — worth doing before building the
   example app on top of these tools, as a sanity check that the real tool
   surface behaves as the unit/integration tests assume.
   **Done 2026-07-22, in HTTP mode instead of stdio** —
   `scripts/ap2-preflight/walkthrough.mjs` drives the full flow against
   live `wallet-server`/`truvera-api` HTTP servers and passes end-to-end
   (`paymentMandateVerified`, `checkoutMandateVerified`,
   `transactionIdVerified`, `sdHashVerified` all `true`). Run it with
   `node scripts/ap2-preflight/walkthrough.mjs` after booting both servers
   (see script header for exact env vars / Node version). This surfaced
   real gaps in getting `wallet-server` running locally against a
   `file:`-linked `wallet-sdk` — **not fixed, only worked around locally**,
   still blocking a clean local-dev story until properly fixed:
   - `apps/wallet-server/register-aliases.cjs` hardcodes 7
     `@digitalbazaar/*` aliases to this repo's own root `node_modules`.
     They aren't hoisted there anymore now that `wallet-sdk-core`/
     `wallet-sdk-wasm` are `file:` links to the separate `wallet-sdk`
     checkout (which has its own independent, correctly-patched
     `node_modules`). Same regression class already fixed once in
     `jest.integration.config.cjs` via dynamic `require.resolve` — that
     fix was never applied to `register-aliases.cjs`.
   - Deeper than that: `register-aliases.cjs`'s alias technique only
     patches the *first* `require()` hop (CJS). Nested ESM `import`
     statements *inside* an aliased package (e.g. `did-method-key`'s
     `DidKeyDriver.js` importing `@digitalbazaar/ed25519-verification-key-2020`
     by bare specifier) resolve via Node's own ESM loader, which
     module-alias cannot intercept — so they fall through to that
     package's broken CJS `main` entry point (which still uses the
     legacy `esm` package, itself incompatible with Node 22+). This repo
     already has *known-good* one-line patches for exactly this
     (`apps/wallet-server/patches/@digitalbazaar+{minimal-cipher,
     did-method-key,did-io}+*.patch`, applied automatically via
     `patch-package` in this repo's own `postinstall`) — they just never
     reach `wallet-sdk`'s independent copies of the same packages.
   - The `Dockerfile`/`docker-compose.yml` route doesn't sidestep this:
     it only copies `package*.json` from this repo into the build
     context, never the sibling `wallet-sdk` checkout that the `file:`
     dependency points at, so the image build can't resolve those paths
     at all right now.
   - Also hit, unrelated to the above: `WALLET_DB_PATH`/`DID_CACHE_PATH`
     default to `/data/...` (container-only paths) and Node v25 (this
     machine's default) hits an unrelated `ERR_UNSUPPORTED_DIR_IMPORT` in
     `minimal-cipher`'s own `web-streams-polyfill` import that Node v24
     (matching the Dockerfile's `node:24-alpine`) does not — use Node 24
     and override both path env vars to a writable local directory for
     local (non-Docker) runs.
   - **Proper fix, not done**: make `register-aliases.cjs` resolve
     dynamically (mirroring the jest config fix) and/or get `wallet-sdk`'s
     own postinstall to apply these same patches to its own
     `node_modules`, so a fresh `npm install` doesn't require any manual
     workaround. Worth doing before the example app depends on booting
     `wallet-server` locally as a matter of course.

## Part 2: Decided plan for the example app (session of 2026-07-22)

Original ask: a Next.js app demonstrating a complete AP2 workflow, using
`@docknetwork/ap2` for receipts/mandates, the Truvera API for credential
issuance/verification, and the Truvera MCP wallet server — sharable as a
blog post and possibly a public sample repo for clients.

### Decisions made this session

- **Demo type: (B) Agentic demo.** Confirmed both `wallet-server` and
  `truvera-api` already support **Streamable HTTP transport** (not just
  stdio) via the shared `packages/mcp-shared/src/transport/http`
  implementation, switched on with `MCP_MODE=http`. Per both apps'
  READMEs, HTTP is the *recommended, well-tested* mode — stdio is called
  "experimental." This removes the child-process/stdio-bridge cost that
  originally made (B) look expensive: a Next.js app (or anything) can
  reach either server as a normal MCP HTTP client at `POST/GET
  http://localhost:<port>/mcp` (3001 for wallet-server, 3000 for
  truvera-api). CORS is wide open; sessions use the `Mcp-Session-Id`
  header and are in-memory only (single-instance demo is fine, no
  horizontal scaling). This makes a real LLM-driven Shopping Agent, making
  genuine MCP tool calls, both feasible and the more compelling *AP2*
  story — so (B) is the plan, not (A).
- **Location: new standalone repo** (e.g. `ap2-example-app`), not a folder
  in this monorepo or `web`. Cleanest to link from a blog post and hand to
  clients without exposing internal monorepo structure.
- **Dependencies: build now on `file:` links.** Start immediately against
  a local `file:` dependency on `@docknetwork/ap2` (from `/home/mparkhill/
  dock/sdk`, branch `ap2/v0.2-mandates`) rather than waiting on PR #611 to
  merge/release. Swap to a real npm version range once it does (Part 1
  cascade item 4). `wallet-sdk` is not a direct dependency of the example
  app — it's internal to `wallet-server`.

### Confirmed tool surface (researched this session — use these exact names)

**`wallet-server`** (HTTP, port 3001, `MCP_MODE=http npm start`, `/mcp`):
- `dids` feature: `create_did` — prerequisite for the next tool.
- `ap2` feature, 5 tools: `create_ap2_signing_key`,
  `issue_open_checkout_mandate`, `issue_closed_checkout_mandate`,
  `issue_open_payment_mandate`, `issue_closed_payment_mandate`.
- Two identities are needed — **User** and **Shopping Agent** — each via
  `create_did` → `create_ap2_signing_key` → `{keyId, publicJwk}`.

**`truvera-api`** (HTTP, port 3000, `MCP_MODE=http npm run dev`, `/mcp`):
- `ap2` feature, 2 tools: `verify_payment_mandate`, `issue_payment_token`.
- Verification is pure local crypto (no live Truvera API call). Important
  gap to design around: `issue_payment_token`'s receipt is built but
  **never cryptographically signed** right now (`signed` is always
  `false`) — there's no processor key wired up. The demo's "PSP signs the
  receipt" step has to happen in the example app itself (see Merchant/PSP
  below), not via this tool.

**`@docknetwork/ap2`** (v0.3.0, `sdk` repo, `packages/ap2`):
- Mandates: build+sign only, from the user/agent side. There is no
  `verifyOpen*Mandate` — Open Mandates are verified implicitly via
  `sd_hash` chaining when a Closed mandate references them.
- The **Checkout JWT** a merchant issues is entirely outside this
  package's scope — no schema, builder, or verifier for it exists. It's
  an opaque string; the package only hashes it (`computeCheckoutHash`)
  and checks that hash matches on verify. The Merchant mock in the example
  app has to construct and sign this JWT itself (plain `jose`, arbitrary
  cart/total payload).
- Receipts (`buildPaymentReceipt`/`issuePaymentReceipt`/
  `verifyPaymentReceipt`, etc.) *are* in this package — this is what the
  Merchant/PSP mock uses to actually sign and verify the Payment Receipt,
  since `truvera-api`'s tool won't.
- All `sign*` functions take a `signer` callback (ES256/secp256r1), not a
  raw key.

### Actors and where each lives

- **User (wallet)** — a DID+key created via `wallet-server`'s `dids` +
  `ap2` tools. Constraints (line items, allowed merchants, budget/amount
  range) entered through the UI.
- **Shopping Agent** — the actual LLM (Claude), with `wallet-server`'s ap2
  tools *and* `truvera-api`'s 2 tools exposed as one MCP toolset over
  HTTP. Drives steps 3 and 5, initiates 6. Should make a real decision —
  checking the closed checkout total against the user's stated budget
  constraint before closing the Payment Mandate — rather than blindly
  executing a fixed script. That check is the actual "agentic" value worth
  dramatizing for the blog post, not just wiring tool calls in sequence.
- **Merchant / PSP** — a mock service *inside the example app* (a plain
  API route, not an MCP server): issues a self-signed Checkout JWT, and
  later signs the Payment Receipt via `@docknetwork/ap2`'s
  `issuePaymentReceipt` once it sees a verified transaction. Entirely
  bespoke to the demo — no AP2 tooling exists for the checkout-JWT half.
- **Credential Provider** — `truvera-api`'s 2 tools, called directly (a
  deterministic verify/issue step, doesn't need its own LLM role).

### Concrete flow (revised against the real tool surface)

0. Setup: `create_did` + `create_ap2_signing_key` once each for User and
   Shopping Agent.
1. User states intent + constraints in the UI → agent calls
   `issue_open_checkout_mandate` (User's `keyId`/`publicJwk`,
   `checkout.line_items`/`checkout.allowed_merchants` constraints).
2. Merchant mock returns a cart total + self-signed Checkout JWT.
3. Agent calls `issue_closed_checkout_mandate` (Agent's `keyId`,
   `checkoutJwt`, `nonce`, `openMandatePresentation`) → closed checkout
   presentation + `checkoutHash`.
4. User states payment constraints (budget/amount range) → agent calls
   `issue_open_payment_mandate` (User's `keyId`/`publicJwk`, constraints
   incl. a `payment.reference` tying it to the checkout).
5. Agent checks the checkout total against the user's budget itself, then
   calls `issue_closed_payment_mandate` (Agent's `keyId`, `checkoutJwt`,
   `payee`, `paymentAmount`, `paymentInstrument`, `nonce`,
   `openMandatePresentation`) → closed payment presentation +
   `transactionId`.
6. Agent calls `issue_payment_token` (closed payment presentation,
   User's `publicJwk` as `holderJwk`, `checkoutJwt`, the four open/closed
   presentations, `issuer`, `paymentId`) → verification result + unsigned
   receipt content.
7. Merchant/PSP mock signs the real Payment Receipt
   (`issuePaymentReceipt`) and the app verifies it
   (`verifyPaymentReceipt`), closing the loop.

The UI should show the real artifacts at every step — SD-JWTs,
disclosures, hash/nonce/`transaction_id` values, verification booleans —
not just a success checkmark, per the original framing.

### Build plan (phased)

0. **Pre-flight sanity check** (do this before scaffolding anything new):
   run the manual E2E MCP walkthrough flagged in Part 1 item 5, in HTTP
   mode specifically — boot both servers locally and drive the flow above
   by hand (curl or a throwaway script) to confirm the real tool surface
   behaves as the unit/integration tests assume, before an LLM is in the
   loop. This also produces real request/response payloads to use as
   fixtures for the agent's system prompt / tool descriptions.
1. **Repo scaffold** — new standalone repo, Next.js (App Router, TS).
   `@docknetwork/ap2` as a `file:` dependency on the local `sdk` checkout.
2. **Local services** — docker-compose (or documented manual steps) to
   run `wallet-server` + `truvera-api` in HTTP mode as sibling services,
   pointing at the local `truvera-mcp-server` checkout for now.
3. **MCP client wiring** — connect to both `/mcp` endpoints
   (`StreamableHTTPClientTransport`), confirm tool discovery, combine into
   one toolset for the Shopping Agent.
4. **Merchant/PSP mock** — checkout-JWT issuance endpoint + payment
   receipt issuance/verification via `@docknetwork/ap2`.
5. **Shopping Agent** — system prompt describing the role, the user's
   constraints, and the budget-check decision point; tool-use loop over
   the combined MCP toolset. *Spike first*: whether to use the Claude
   Agent SDK's native `mcpServers` config (if it supports HTTP transport
   directly) vs. hand-rolling an Anthropic Messages API tool-use loop —
   not resolved yet, small enough to decide once code starts.
6. **UI** — actor panels (User/Wallet, Shopping Agent transcript,
   Merchant, Credential Provider) surfacing real JWT/disclosure/
   verification content at each step.
7. **Config/env** — Truvera testnet API key, wallet master key, demo
   keypairs; document every required env var.
8. **End-to-end manual walkthrough** in a browser; fix rough edges.
9. **README + blog post write-up.**
10. **Before public launch**: push `wallet-sdk`'s and
    `truvera-mcp-server`'s branches/PRs (Part 1 cascade items 1–2), and
    decide whether the example repo can go public before `sdk`#611 (and
    those PRs) merge/release — a client-facing sample shouldn't need
    cloning private, unpublished branches indefinitely. Swap `file:` links
    to real npm ranges at that point.

### Open items not decided this session

- Exact LLM tool-use mechanism (Claude Agent SDK native MCP-over-HTTP
  support vs. a hand-rolled tool loop) — spike at the start of phase 5.
- Whether the example repo is public from day one or private until Part
  1's cascade lands.
- Demo key / wallet master key handling for whatever ends up public —
  must not be real secrets.
