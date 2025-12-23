import { describe, it, expect, vi } from "vitest";
import { getHandlers } from "../tools";

describe("teams tools handlers", () => {
  it("list_invitations returns error when id missing", async () => {
    const mockTeams: any = { listInvitations: vi.fn() };
    const handlers = getHandlers(mockTeams);
    const handler = handlers.get("list_invitations")!;
    const res = await handler({});
    expect(res.isError).toBe(true);
    expect(res.content[0].text).toContain("'id' is required");
  });

  it("list_invitations returns error when id is not integer", async () => {
    const mockTeams: any = { listInvitations: vi.fn() };
    const handlers = getHandlers(mockTeams);
    const handler = handlers.get("list_invitations")!;
    const res = await handler({ id: "abc" });
    expect(res.isError).toBe(true);
    expect(res.content[0].text).toContain("'id' must be an integer");
  });

  it("list_invitations forwards to client when id is provided", async () => {
    const payload = [{ invitation: 1 }];
    const mockTeams: any = {
      listInvitations: vi.fn(async (teamId: number, opts?: any) => ({ success: true, data: payload })),
    };
    const handlers = getHandlers(mockTeams);
    const handler = handlers.get("list_invitations")!;
    const res = await handler({ id: 42, offset: 0, limit: 10 });
    expect(res.isError).not.toBe(true);
    expect(res.content[0].text).toContain(JSON.stringify(payload, null, 2));
    expect(mockTeams.listInvitations).toHaveBeenCalledWith(42, { offset: 0, limit: 10 });
  });

  it("list_members validates id and forwards to client", async () => {
    const payload = [{ member: 1 }];
    const mockTeams: any = {
      listMembers: vi.fn(async (teamId: number, opts?: any) => ({ success: true, data: payload })),
    };
    const handlers = getHandlers(mockTeams);
    const handler = handlers.get("list_members")!;
    const res = await handler({ id: 7 });
    expect(res.isError).not.toBe(true);
    expect(res.content[0].text).toContain(JSON.stringify(payload, null, 2));
    expect(mockTeams.listMembers).toHaveBeenCalledWith(7, { offset: undefined, limit: undefined });
  });
});
