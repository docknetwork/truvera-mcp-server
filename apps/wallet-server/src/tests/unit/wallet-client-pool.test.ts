import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../../wallet-client.js", () => ({
  WalletClient: vi.fn(),
}));

import { WalletClientPool } from "../../wallet-client-pool.js";
import { WalletClient } from "../../wallet-client.js";

const MockWalletClient = WalletClient as unknown as ReturnType<typeof vi.fn>;

function setupMock(overrides: { initialize?: () => Promise<void>; deleteWallet?: () => Promise<void> } = {}) {
  MockWalletClient.mockImplementation(function (this: Record<string, unknown>) {
    this.initialize = overrides.initialize ?? vi.fn().mockResolvedValue(undefined);
    this.deleteWallet = overrides.deleteWallet ?? vi.fn().mockResolvedValue(undefined);
    this.getWallet = vi.fn().mockReturnValue({});
    this.isInitialized = vi.fn().mockReturnValue(true);
  });
}

beforeEach(() => {
  MockWalletClient.mockReset();
  setupMock();
});

describe("WalletClientPool", () => {
  describe("get()", () => {
    it("returns the same instance for repeated calls with the same path", async () => {
      const pool = new WalletClientPool();
      const a = await pool.get("/data/wallets/alice", "testnet");
      const b = await pool.get("/data/wallets/alice", "testnet");
      expect(a).toBe(b);
    });

    it("returns distinct instances for different paths", async () => {
      const pool = new WalletClientPool();
      const alice = await pool.get("/data/wallets/alice", "testnet");
      const bob = await pool.get("/data/wallets/bob", "testnet");
      expect(alice).not.toBe(bob);
    });

    it("only calls WalletClient constructor once per path regardless of concurrency", async () => {
      const pool = new WalletClientPool();
      const [a, b] = await Promise.all([
        pool.get("/data/wallets/alice", "testnet"),
        pool.get("/data/wallets/alice", "testnet"),
      ]);
      expect(a).toBe(b);
      expect(MockWalletClient).toHaveBeenCalledTimes(1);
    });

    it("passes the last path segment as walletName to WalletClient", async () => {
      const pool = new WalletClientPool();
      await pool.get("/data/wallets/alice", "testnet");
      expect(MockWalletClient).toHaveBeenCalledWith("alice", "testnet", "/data/wallets/alice");
    });

    it("removes a failed entry from the pool so the next call can retry", async () => {
      let callCount = 0;
      MockWalletClient.mockImplementation(function (this: Record<string, unknown>) {
        callCount++;
        this.deleteWallet = vi.fn().mockResolvedValue(undefined);
        this.getWallet = vi.fn().mockReturnValue({});
        this.isInitialized = vi.fn().mockReturnValue(true);
        // Fail the first time, succeed the second
        this.initialize = callCount === 1
          ? vi.fn().mockRejectedValue(new Error("DB locked"))
          : vi.fn().mockResolvedValue(undefined);
      });

      const pool = new WalletClientPool();
      await expect(pool.get("/data/wallets/alice", "testnet")).rejects.toThrow("DB locked");

      const client = await pool.get("/data/wallets/alice", "testnet");
      expect(client).toBeDefined();
      expect(MockWalletClient).toHaveBeenCalledTimes(2);
    });
  });

  describe("shutdownAll()", () => {
    it("calls deleteWallet() on every cached client", async () => {
      const pool = new WalletClientPool();
      const alice = await pool.get("/data/wallets/alice", "testnet");
      const bob = await pool.get("/data/wallets/bob", "testnet");

      await pool.shutdownAll();

      expect((alice as any).deleteWallet).toHaveBeenCalledOnce();
      expect((bob as any).deleteWallet).toHaveBeenCalledOnce();
    });

    it("clears the pool so a subsequent get() reinitialises", async () => {
      const pool = new WalletClientPool();
      await pool.get("/data/wallets/alice", "testnet");
      await pool.shutdownAll();

      MockWalletClient.mockClear();
      await pool.get("/data/wallets/alice", "testnet");

      expect(MockWalletClient).toHaveBeenCalledTimes(1);
    });

    it("continues shutting down remaining clients if one deleteWallet() throws", async () => {
      let callCount = 0;
      MockWalletClient.mockImplementation(function (this: Record<string, unknown>) {
        callCount++;
        this.initialize = vi.fn().mockResolvedValue(undefined);
        this.getWallet = vi.fn().mockReturnValue({});
        this.isInitialized = vi.fn().mockReturnValue(true);
        // First client (alice) fails to delete
        this.deleteWallet = callCount === 1
          ? vi.fn().mockRejectedValue(new Error("cleanup failed"))
          : vi.fn().mockResolvedValue(undefined);
      });

      const pool = new WalletClientPool();
      await pool.get("/data/wallets/alice", "testnet");
      const bob = await pool.get("/data/wallets/bob", "testnet");

      await expect(pool.shutdownAll()).resolves.toBeUndefined();
      expect((bob as any).deleteWallet).toHaveBeenCalledOnce();
    });
  });
});
