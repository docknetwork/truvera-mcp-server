import { describe, it, expect } from "vitest";
import { generateKeyPair, exportSPKI, exportPKCS8, SignJWT, type CryptoKey } from "jose";
import type { IncomingMessage } from "node:http";
import {
  extractBearerToken,
  verifyJWT,
  deriveWalletKey,
  resolveAuthContext,
  AuthError,
} from "./index.js";

function mockReq(headers: Record<string, string>): IncomingMessage {
  return { headers } as unknown as IncomingMessage;
}

async function makeKeypair() {
  const { publicKey, privateKey } = await generateKeyPair("ES256", { extractable: true });
  return {
    publicKeyPem: await exportSPKI(publicKey),
    privateKeyPem: await exportPKCS8(privateKey),
    publicKey,
    privateKey,
  };
}

async function signJWT(privateKey: CryptoKey, sub: string, expiresIn = "1h") {
  return new SignJWT({})
    .setProtectedHeader({ alg: "ES256" })
    .setSubject(sub)
    .setIssuedAt()
    .setExpirationTime(expiresIn)
    .sign(privateKey);
}

// ---------------------------------------------------------------------------
describe("extractBearerToken", () => {
  it("extracts the token from a valid Bearer header", () => {
    expect(extractBearerToken(mockReq({ authorization: "Bearer mytoken123" }))).toBe("mytoken123");
  });

  it("returns null when the Authorization header is absent", () => {
    expect(extractBearerToken(mockReq({}))).toBeNull();
  });

  it("returns null for a non-Bearer scheme", () => {
    expect(extractBearerToken(mockReq({ authorization: "Basic abc123" }))).toBeNull();
  });

  it("returns null when the token after Bearer is only whitespace", () => {
    expect(extractBearerToken(mockReq({ authorization: "Bearer   " }))).toBeNull();
  });
});

// ---------------------------------------------------------------------------
describe("verifyJWT", () => {
  it("accepts a valid ES256 JWT and returns the sub claim", async () => {
    const { publicKeyPem, privateKey } = await makeKeypair();
    const token = await signJWT(privateKey, "alice");
    const result = await verifyJWT(token, publicKeyPem);
    expect(result.sub).toBe("alice");
  });

  it("rejects an expired JWT", async () => {
    const { publicKeyPem, privateKey } = await makeKeypair();
    // Issue a token with a 1-second expiry then wait past it
    const token = await new SignJWT({})
      .setProtectedHeader({ alg: "ES256" })
      .setSubject("alice")
      .setIssuedAt()
      .setExpirationTime(Math.floor(Date.now() / 1000) - 1) // already expired
      .sign(privateKey);

    await expect(verifyJWT(token, publicKeyPem)).rejects.toBeInstanceOf(AuthError);
  });

  it("rejects a JWT signed with a different private key", async () => {
    const { privateKey } = await makeKeypair();
    const { publicKeyPem: wrongPublicKeyPem } = await makeKeypair();
    const token = await signJWT(privateKey, "alice");
    await expect(verifyJWT(token, wrongPublicKeyPem)).rejects.toBeInstanceOf(AuthError);
  });

  it("rejects a JWT with no sub claim", async () => {
    const { publicKeyPem, privateKey } = await makeKeypair();
    const token = await new SignJWT({})
      .setProtectedHeader({ alg: "ES256" })
      .setIssuedAt()
      .setExpirationTime("1h")
      .sign(privateKey);
    await expect(verifyJWT(token, publicKeyPem)).rejects.toBeInstanceOf(AuthError);
  });

  it("throws AuthError with statusCode 403 for a malformed public key", async () => {
    const err = await verifyJWT("anytoken", "not-a-pem").catch((e) => e);
    expect(err).toBeInstanceOf(AuthError);
    expect(err.statusCode).toBe(403);
  });

  it("rejects a plainly invalid (non-JWT) token string", async () => {
    const { publicKeyPem } = await makeKeypair();
    await expect(verifyJWT("not.a.jwt", publicKeyPem)).rejects.toBeInstanceOf(AuthError);
  });
});

// ---------------------------------------------------------------------------
describe("deriveWalletKey", () => {
  it("is deterministic — same inputs always produce the same key", () => {
    expect(deriveWalletKey("secret", "alice")).toBe(deriveWalletKey("secret", "alice"));
  });

  it("produces different keys for different tenant IDs", () => {
    expect(deriveWalletKey("secret", "alice")).not.toBe(deriveWalletKey("secret", "bob"));
  });

  it("produces different keys for different master secrets", () => {
    expect(deriveWalletKey("secret-a", "alice")).not.toBe(deriveWalletKey("secret-b", "alice"));
  });

  it("returns a 64-character lowercase hex string (SHA-256 output)", () => {
    expect(deriveWalletKey("secret", "alice")).toMatch(/^[0-9a-f]{64}$/);
  });
});

// ---------------------------------------------------------------------------
describe("resolveAuthContext", () => {
  it("returns {mode:'none'} immediately without inspecting headers", async () => {
    const ctx = await resolveAuthContext(mockReq({}), { mode: "none" });
    expect(ctx).toEqual({ mode: "none" });
  });

  it("returns passthrough context carrying the raw API key", async () => {
    const ctx = await resolveAuthContext(
      mockReq({ authorization: "Bearer my-api-key" }),
      { mode: "passthrough" }
    );
    expect(ctx).toEqual({ mode: "passthrough", apiKey: "my-api-key" });
  });

  it("throws AuthError when token is missing in passthrough mode", async () => {
    await expect(
      resolveAuthContext(mockReq({}), { mode: "passthrough" })
    ).rejects.toBeInstanceOf(AuthError);
  });

  it("falls back to fallbackApiKey when no header is sent in passthrough mode", async () => {
    const ctx = await resolveAuthContext(
      mockReq({}),
      { mode: "passthrough", fallbackApiKey: "shared-team-key" }
    );
    expect(ctx).toEqual({ mode: "passthrough", apiKey: "shared-team-key" });
  });

  it("prefers the per-request header over fallbackApiKey when both are present", async () => {
    const ctx = await resolveAuthContext(
      mockReq({ authorization: "Bearer per-request-key" }),
      { mode: "passthrough", fallbackApiKey: "shared-team-key" }
    );
    expect(ctx).toEqual({ mode: "passthrough", apiKey: "per-request-key" });
  });

  it("returns jwt context with the tenantId from the sub claim", async () => {
    const { publicKeyPem, privateKey } = await makeKeypair();
    const token = await signJWT(privateKey, "alice");
    const ctx = await resolveAuthContext(
      mockReq({ authorization: `Bearer ${token}` }),
      { mode: "jwt", publicKeyPem }
    );
    expect(ctx).toEqual({ mode: "jwt", tenantId: "alice", token });
  });

  it("throws AuthError when no token is provided in jwt mode", async () => {
    const { publicKeyPem } = await makeKeypair();
    await expect(
      resolveAuthContext(mockReq({}), { mode: "jwt", publicKeyPem })
    ).rejects.toBeInstanceOf(AuthError);
  });

  it("throws AuthError when the JWT fails verification in jwt mode", async () => {
    const { publicKeyPem } = await makeKeypair();
    await expect(
      resolveAuthContext(
        mockReq({ authorization: "Bearer not-a-valid-jwt" }),
        { mode: "jwt", publicKeyPem }
      )
    ).rejects.toBeInstanceOf(AuthError);
  });

  it("throws AuthError with statusCode 401 for a missing token", async () => {
    const { publicKeyPem } = await makeKeypair();
    const err = await resolveAuthContext(mockReq({}), { mode: "jwt", publicKeyPem }).catch((e) => e);
    expect(err).toBeInstanceOf(AuthError);
    expect(err.statusCode).toBe(401);
  });
});
