#!/usr/bin/env node
/**
 * Mint a JWT for a wallet-server tenant.
 *
 * Usage:
 *   node scripts/mint-jwt.js <tenantId> --secret <secretId> [options]
 *
 * Arguments:
 *   <tenantId>           Unique identifier for the tenant (becomes the JWT `sub` claim).
 *                        Determines wallet path on the server: /data/wallets/<tenantId>
 *   --secret <secretId>  AWS Secrets Manager secret name or ARN containing the PEM private key.
 *                        Defaults to MCP_JWT_PRIVATE_KEY_SECRET env var.
 *   --profile <name>     AWS profile to use (e.g. dev, prod). Defaults to AWS_PROFILE env var
 *                        or the default profile.
 *   --region <region>    AWS region (e.g. us-east-1). Defaults to AWS_REGION env var.
 *   --expires-in <dur>   Token lifetime. Examples: 30d, 90d, 1y  (default: 1y)
 *
 * Output: the signed JWT token on stdout; info on stderr.
 *
 * Examples:
 *   node scripts/mint-jwt.js alice --secret prod/wallet-server/jwt-key --profile prod --expires-in 90d
 *   node scripts/mint-jwt.js bob   --secret dev/wallet-server/jwt-key  --profile dev
 */

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
const awsProfile = flag("--profile") ?? process.env.AWS_PROFILE;
const awsRegion = flag("--region") ?? process.env.AWS_REGION;
const expiresIn = flag("--expires-in") ?? "1y";

if (!tenantId) {
  console.error("Usage: node scripts/mint-jwt.js <tenantId> --secret <secretId> [--profile <name>] [--region <region>] [--expires-in <duration>]");
  console.error("Example: node scripts/mint-jwt.js alice --secret prod/wallet-server/jwt-private-key --profile prod --expires-in 90d");
  process.exit(1);
}

if (!secretId) {
  console.error("Error: --secret <secretId> is required (or set MCP_JWT_PRIVATE_KEY_SECRET env var).");
  console.error("The secret should contain the PEM private key from scripts/generate-keypair.js");
  process.exit(1);
}

// --- build AWS client ---
const smConfig = {};
if (awsRegion) smConfig.region = awsRegion;
if (awsProfile) smConfig.credentials = fromIni({ profile: awsProfile });

const smClient = new SecretsManagerClient(smConfig);

// --- fetch private key from Secrets Manager ---
process.stderr.write(`Fetching private key from Secrets Manager${awsProfile ? ` (profile: ${awsProfile})` : ""}\n`);

let privatePem;
try {
  const response = await smClient.send(new GetSecretValueCommand({ SecretId: secretId }));
  privatePem = response.SecretString;
  if (!privatePem) throw new Error("Secret has no string value (binary secrets are not supported)");
} catch (err) {
  console.error("Error fetching private key from Secrets Manager.");
  process.exit(1);
}

let privateKey;
try {
  privateKey = await importPKCS8(privatePem.trim(), "ES256");
} catch {
  console.error(`Error: secret "${secretId}" is not a valid ES256 PKCS8 private key.`);
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
