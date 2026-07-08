import { createHmac } from "node:crypto";
import { jwtVerify, importSPKI } from "jose";
import type { IncomingMessage } from "node:http";

export type AuthConfig =
  | { mode: "jwt"; publicKeyPem: string }
  | { mode: "passthrough" }
  | { mode: "none" };

export type AuthContext =
  | { mode: "jwt"; tenantId: string; token: string }
  | { mode: "passthrough"; apiKey: string }
  | { mode: "none" };

export class AuthError extends Error {
  constructor(
    message: string,
    public readonly statusCode: 401 | 403 = 401
  ) {
    super(message);
    this.name = "AuthError";
  }
}

export function extractBearerToken(req: IncomingMessage): string | null {
  const header = req.headers["authorization"];
  if (typeof header !== "string" || !header.startsWith("Bearer ")) return null;
  const token = header.slice(7).trim();
  return token.length > 0 ? token : null;
}

export async function verifyJWT(
  token: string,
  publicKeyPem: string
): Promise<{ sub: string }> {
  let key;
  try {
    key = await importSPKI(publicKeyPem, "ES256");
  } catch {
    throw new AuthError("Server misconfiguration: invalid public key", 403);
  }

  let payload;
  try {
    ({ payload } = await jwtVerify(token, key, { algorithms: ["ES256"] }));
  } catch (err) {
    const message = err instanceof Error ? err.message : "Invalid token";
    throw new AuthError(`Token verification failed: ${message}`);
  }

  if (typeof payload.sub !== "string" || payload.sub.length === 0) {
    throw new AuthError("Token missing required sub claim");
  }

  return { sub: payload.sub };
}

export function deriveWalletKey(masterSecret: string, tenantId: string): string {
  return createHmac("sha256", masterSecret).update(tenantId).digest("hex");
}

export async function resolveAuthContext(
  req: IncomingMessage,
  config: AuthConfig
): Promise<AuthContext> {
  if (config.mode === "none") {
    return { mode: "none" };
  }

  const token = extractBearerToken(req);
  if (!token) {
    throw new AuthError("Missing Authorization header");
  }

  if (config.mode === "passthrough") {
    return { mode: "passthrough", apiKey: token };
  }

  const { sub } = await verifyJWT(token, config.publicKeyPem);
  return { mode: "jwt", tenantId: sub, token };
}
