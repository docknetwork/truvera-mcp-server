#!/usr/bin/env node
/**
 * Mint a JWT for a wallet-server tenant.
 *
 * Usage:
 *   node scripts/mint-jwt.js <tenantId> --secret <secretId> [options]
 *   node scripts/mint-jwt.js <tenantId> --key-file <path>   [options]
 *
 * Arguments:
 *   <tenantId>           Unique identifier for the tenant (becomes the JWT `sub` claim).
 *                        Determines wallet path on the server: /data/wallets/<tenantId>
 *   --secret <secretId>  AWS Secrets Manager secret name or ARN containing the PEM private key.
 *                        Defaults to MCP_JWT_PRIVATE_KEY_SECRET env var.
 *   --key-file <path>    Path to a local PEM private key file (from scripts/generate-keypair.js).
 *                        Defaults to MCP_JWT_PRIVATE_KEY_FILE env var. Dev-only alternative to
 *                        --secret — mutually exclusive with it. Never use a --key-file key for
 *                        a real deployment; keep dev and prod keypairs separate.
 *   --profile <name>     AWS profile to use (e.g. dev, prod). Defaults to AWS_PROFILE env var
 *                        or the default profile. Ignored with --key-file.
 *   --region <region>    AWS region (e.g. us-east-1). Defaults to AWS_REGION env var.
 *                        Ignored with --key-file.
 *   --expires-in <dur>   Token lifetime. Examples: 30d, 90d, 1y  (default: 1y)
 *
 * Output: the signed JWT token on stdout; info on stderr.
 *
 * Examples:
 *   node scripts/mint-jwt.js alice --secret prod/wallet-server/jwt-key --profile prod --expires-in 90d
 *   node scripts/mint-jwt.js bob   --secret dev/wallet-server/jwt-key  --profile dev
 *   node scripts/mint-jwt.js carol --key-file ./dev-jwt-private-key.pem --expires-in 30d
 */

import { readFile } from "node:fs/promises";
import { SecretsManagerClient, GetSecretValueCommand } from "@aws-sdk/client-secrets-manager";
import { fromIni } from "@aws-sdk/credential-providers";
import { SignJWT, importPKCS8, decodeJwt } from "jose";

// --- parse args ---
const args = process.argv.slice(2);

function flag(name) {
  const idx = args.indexOf(name);
  return idx !== -1 ? args[idx + 1] : undefined;
}

const tenantId = args.find((a) => !a.startsWith("--"));
const secretId = flag("--secret") ?? process.env.MCP_JWT_PRIVATE_KEY_SECRET;
const keyFile = flag("--key-file") ?? process.env.MCP_JWT_PRIVATE_KEY_FILE;
const awsProfile = flag("--profile") ?? process.env.AWS_PROFILE;
const awsRegion = flag("--region") ?? process.env.AWS_REGION;
const expiresIn = flag("--expires-in") ?? "1y";

if (!tenantId) {
  console.error("Usage: node scripts/mint-jwt.js <tenantId> (--secret <secretId> | --key-file <path>) [--profile <name>] [--region <region>] [--expires-in <duration>]");
  console.error("Example: node scripts/mint-jwt.js alice --secret prod/wallet-server/jwt-private-key --profile prod --expires-in 90d");
  console.error("Example: node scripts/mint-jwt.js alice --key-file ./dev-jwt-private-key.pem --expires-in 30d");
  process.exit(1);
}

if (secretId && keyFile) {
  console.error("Error: --secret and --key-file are mutually exclusive. Pick one key source.");
  process.exit(1);
}

if (!secretId && !keyFile) {
  console.error("Error: --secret <secretId> or --key-file <path> is required");
  console.error("(or set MCP_JWT_PRIVATE_KEY_SECRET / MCP_JWT_PRIVATE_KEY_FILE env var).");
  console.error("The key should be the PEM private key from scripts/generate-keypair.js");
  process.exit(1);
}

// --- fetch private key ---
let privatePem;
if (keyFile) {
  process.stderr.write(`Reading private key from local file: ${keyFile}\n`);
  try {
    privatePem = await readFile(keyFile, "utf8");
  } catch (err) {
    console.error(`Error reading private key file: ${err.message}`);
    process.exit(1);
  }
} else {
  const smConfig = {};
  if (awsRegion) smConfig.region = awsRegion;
  if (awsProfile) smConfig.credentials = fromIni({ profile: awsProfile });

  const smClient = new SecretsManagerClient(smConfig);

  process.stderr.write(`Fetching private key from Secrets Manager${awsProfile ? ` (profile: ${awsProfile})` : ""}\n`);

  try {
    const response = await smClient.send(new GetSecretValueCommand({ SecretId: secretId }));
    privatePem = response.SecretString;
    if (!privatePem) throw new Error("Secret has no string value (binary secrets are not supported)");
  } catch (err) {
    console.error("Error fetching private key from Secrets Manager.");
    process.exit(1);
  }
}

let privateKey;
try {
  privateKey = await importPKCS8(privatePem.trim(), "ES256");
} catch {
  console.error("Error: configured secret is not a valid ES256 PKCS8 private key.");
  console.error("Generate a keypair with: node scripts/generate-keypair.js");
  process.exit(1);
}

// --- mint ---
const token = await new SignJWT({})
  .setProtectedHeader({ alg: "ES256" })
  .setSubject(tenantId)
  .setIssuedAt()
  .setExpirationTime(expiresIn)
  .sign(privateKey);

const payload = decodeJwt(token);
const exp = new Date(payload.exp * 1000).toISOString();

process.stderr.write(`Minted JWT for tenant "${tenantId}" (expires ${exp})\n`);
process.stdout.write(token + "\n");
