#!/usr/bin/env node
/**
 * Generate an ES256 keypair for wallet-server JWT auth.
 *
 * Usage:
 *   node scripts/generate-keypair.js
 *
 * The private key is used by the admin to mint tenant JWTs (scripts/mint-jwt.js).
 * The public key goes into the ECS task definition as MCP_JWT_PUBLIC_KEY.
 */

import { generateKeyPair, exportPKCS8, exportSPKI } from "jose";

const { publicKey, privateKey } = await generateKeyPair("ES256", { extractable: true });

const privatePem = await exportPKCS8(privateKey);
const publicPem = await exportSPKI(publicKey);

console.log(`
╔══════════════════════════════════════════════════════╗
║         WALLET SERVER JWT KEYPAIR GENERATED          ║
╚══════════════════════════════════════════════════════╝

▼ PRIVATE KEY — keep this secret ▼
Store in AWS Secrets Manager and use with mint-jwt.js --secret (prod/shared deployments),
or save to a local file and use with mint-jwt.js --key-file (local dev only).
Never commit it or add it to an ECS task definition.

${privatePem}
▼ PUBLIC KEY — add to ECS task definition ▼
Set as environment variable: MCP_JWT_PUBLIC_KEY

${publicPem}`);
