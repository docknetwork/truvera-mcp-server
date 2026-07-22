import os from "node:os";
import path from "node:path";
import fs from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { describe, it, expect, afterEach } from "vitest";
import { RevocationStore } from "../../revocation-store.js";

async function tmpDbPath() {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "revocation-store-test-"));
  return path.join(dir, `${randomUUID()}.db`);
}

describe("RevocationStore", () => {
  const stores: RevocationStore[] = [];

  afterEach(async () => {
    await Promise.all(stores.splice(0).map((s) => s.close()));
  });

  function makeStore(dbPath: string) {
    const store = new RevocationStore(dbPath);
    stores.push(store);
    return store;
  }

  it("is not revoked for a tenant that was never revoked", async () => {
    const store = makeStore(await tmpDbPath());
    await expect(store.isRevoked("alice", 1_000)).resolves.toBe(false);
  });

  it("treats a token issued before the revocation cutoff as revoked", async () => {
    const store = makeStore(await tmpDbPath());
    await store.revoke("alice", 1_000);
    await expect(store.isRevoked("alice", 500)).resolves.toBe(true);
  });

  it("treats a token issued at or after the revocation cutoff as not revoked", async () => {
    const store = makeStore(await tmpDbPath());
    await store.revoke("alice", 1_000);
    await expect(store.isRevoked("alice", 1_000)).resolves.toBe(false);
    await expect(store.isRevoked("alice", 1_500)).resolves.toBe(false);
  });

  it("does not affect other tenants", async () => {
    const store = makeStore(await tmpDbPath());
    await store.revoke("alice", 1_000);
    await expect(store.isRevoked("bob", 500)).resolves.toBe(false);
  });

  it("moving the cutoff forward re-revokes tokens issued between the old and new cutoff", async () => {
    const store = makeStore(await tmpDbPath());
    await store.revoke("alice", 1_000);
    // A token minted after the first revocation is fine...
    await expect(store.isRevoked("alice", 1_200)).resolves.toBe(false);
    // ...until the tenant is revoked again with a later cutoff.
    await store.revoke("alice", 1_500);
    await expect(store.isRevoked("alice", 1_200)).resolves.toBe(true);
  });

  it("persists the revocation cutoff across separate store instances on the same file", async () => {
    const dbPath = await tmpDbPath();
    const first = makeStore(dbPath);
    await first.revoke("alice", 1_000);
    await first.close();
    stores.splice(stores.indexOf(first), 1);

    const second = makeStore(dbPath);
    await expect(second.isRevoked("alice", 500)).resolves.toBe(true);
  });
});
