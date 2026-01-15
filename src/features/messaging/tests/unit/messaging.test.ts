import { describe, it, expect, vi } from "vitest";
import { MessagingClient } from "../../client";

describe("unit: MessagingClient.listMessages", () => {
  it("rejects with 404 when API returns not found", async () => {
    const fakeTruvera: any = {
      request: vi.fn(async () => {
        const err: any = new Error('not found');
        err.status = 404;
        throw err;
      }),
    };
    const c = new MessagingClient(fakeTruvera as any);
    await expect(c.listMessages()).rejects.toMatchObject({ status: 404 });
  });

  it("returns data on success", async () => {
    const payload = [{ id: 1 }];
    const fakeTruvera: any = { request: vi.fn(async () => ({ success: true, data: payload })) };
    const c = new MessagingClient(fakeTruvera as any);
    const res = await c.listMessages({ offset: 0, limit: 10 });
    expect(res.success).toBe(true);
    expect(res.data).toEqual(payload);
  });
});
