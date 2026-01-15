import { describe, it, expect, vi } from "vitest";
import { components } from "../schemas.js";
import { toolDefs, getHandlers } from "../tools.js";

describe("presentations schema and tool definitions", () => {
  it("exposes 'template' property on ProofRequestPayload", () => {
    const props = (components as any).schemas.ProofRequestPayload.properties;
    expect(props.template).toBeDefined();
  });

  it("provides CreateProofRequestArgs that requires body and optionally templateId", () => {
    const sch = (components as any).schemas.CreateProofRequestArgs;
    expect(sch).toBeDefined();
    expect(sch.required).toEqual(expect.arrayContaining(["body"]));
    expect(sch.properties.templateId.type).toBe("string");
    expect(sch.properties.body.$ref).toContain("ProofRequestPayload");
  });

  it("create_proof_request tool uses CreateProofRequestArgs as input schema", () => {
    const tool = (toolDefs as any).find((t: any) => t.name === "create_proof_request");
    expect(tool).toBeDefined();
    // the tool's inputSchema should reference CreateProofRequestArgs
    expect(tool.inputSchema).toBe((components as any).schemas.CreateProofRequestArgs);
  });

  it("handler uses body.template when templateId is missing", async () => {
    const fakeClient = {
      createProofRequest: vi.fn()
    } as any;
    const handlers = getHandlers(fakeClient as any);
    const handler = handlers.get("create_proof_request")!;

    fakeClient.createProofRequest.mockResolvedValue({ success: true, data: { id: "proof-123" } });
    const res = await handler({ body: { template: "123e4567-e89b-12d3-a456-426614174000", attributes: {} } });
    expect(fakeClient.createProofRequest).toHaveBeenCalledWith("123e4567-e89b-12d3-a456-426614174000", { attributes: {} });
    expect(res.isError).not.toBe(true);
    expect(res.content).toBeDefined();
  });

  it("handler accepts matching templateId and body.template", async () => {
    const fakeClient = {
      createProofRequest: vi.fn()
    } as any;
    const handlers = getHandlers(fakeClient as any);
    const handler = handlers.get("create_proof_request")!;

    fakeClient.createProofRequest.mockResolvedValue({ success: true, data: { id: "proof-456" } });
    const res = await handler({ templateId: "123e4567-e89b-12d3-a456-426614174000", body: { template: "123e4567-e89b-12d3-a456-426614174000", attributes: {} } });
    expect(fakeClient.createProofRequest).toHaveBeenCalledWith("123e4567-e89b-12d3-a456-426614174000", { attributes: {} });
    expect(res.isError).not.toBe(true);
    expect(res.content).toBeDefined();
  });

  it("handler rejects mismatched templateId and body.template", async () => {
    const fakeClient = {
      createProofRequest: vi.fn()
    } as any;
    const handlers = getHandlers(fakeClient as any);
    const handler = handlers.get("create_proof_request")!;

    const res = await handler({ templateId: "aaaaaaaa-1111-2222-3333-cccccccccccc", body: { template: "bbbbbbbb-2222-3333-4444-dddddddddddd", attributes: {} } });
    expect(res).toHaveProperty("isError", true);
    expect(fakeClient.createProofRequest).not.toHaveBeenCalled();
  });
});
