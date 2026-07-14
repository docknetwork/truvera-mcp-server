#!/usr/bin/env node
/**
 * Revoke a tenant's outstanding JWTs on a running wallet-server.
 *
 * Unlike mint-jwt.js, this talks to the server itself — a tenant's
 * revocation cutoff lives in a SQLite file on the server's own persistent
 * volume, not something a local script can write to directly.
 *
 * Usage:
 *   node scripts/revoke-tenant.js <tenantId> --url <serverBaseUrl> [--secret <adminSecret>]
 *
 * Arguments:
 *   <tenantId>        Tenant to revoke (the JWT `sub` claim, e.g. "alice").
 *   --url <url>        Base URL of the wallet-server (e.g. https://wallet.example.com).
 *                       Defaults to WALLET_SERVER_URL env var.
 *   --secret <secret>  Admin secret for POST /admin/revoke-tenant.
 *                       Defaults to ADMIN_REVOKE_SECRET env var.
 *
 * Effect: any JWT for this tenant issued before this call stops being
 * accepted. Tokens minted for the tenant after this call remain valid
 * until their own expiry or the next revocation.
 *
 * Example:
 *   node scripts/revoke-tenant.js alice --url https://wallet-staging.truvera.io --secret $ADMIN_REVOKE_SECRET
 */

const args = process.argv.slice(2);

function flag(name) {
  const idx = args.indexOf(name);
  return idx !== -1 ? args[idx + 1] : undefined;
}

const tenantId = args.find((a) => !a.startsWith("--"));
const serverUrl = flag("--url") ?? process.env.WALLET_SERVER_URL;
const adminSecret = flag("--secret") ?? process.env.ADMIN_REVOKE_SECRET;

if (!tenantId) {
  console.error("Usage: node scripts/revoke-tenant.js <tenantId> --url <serverBaseUrl> [--secret <adminSecret>]");
  process.exit(1);
}

if (!serverUrl) {
  console.error("Error: --url <serverBaseUrl> is required (or set WALLET_SERVER_URL env var).");
  process.exit(1);
}

if (!adminSecret) {
  console.error("Error: --secret <adminSecret> is required (or set ADMIN_REVOKE_SECRET env var).");
  process.exit(1);
}

const endpoint = new URL("/admin/revoke-tenant", serverUrl).toString();

process.stderr.write(`Revoking tenant "${tenantId}" via ${endpoint}\n`);

const response = await fetch(endpoint, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "X-Admin-Secret": adminSecret,
  },
  body: JSON.stringify({ tenantId }),
});

const text = await response.text();

if (!response.ok) {
  console.error(`Error revoking tenant "${tenantId}": ${response.status} ${response.statusText} - ${text}`);
  process.exit(1);
}

process.stderr.write(`Tenant "${tenantId}" revoked. All JWTs issued before this moment are now rejected.\n`);
