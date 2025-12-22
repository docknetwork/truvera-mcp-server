import type { DidClient } from "./client.js";
import type { ToolDef, ToolHandler } from "../../tools/types.js";
import { formatResult } from "../../tools/utils.js";

export const toolDefs: ToolDef[] = [
  { name: "create_did", description: "Create a Decentralized Identifier (DID) in Truvera", inputSchema: { type: "object", properties: { method: { type: "string" }, document: { type: "object" }, metadata: { type: "object" } }, required: ["method"] } },
  { name: "get_did", description: "Get a DID by its identifier", inputSchema: { type: "object", required: ["did"] } },
  { name: "list_dids", description: "List DIDs", inputSchema: { type: "object" } },
  { name: "delete_did", description: "Delete a DID", inputSchema: { type: "object", required: ["did"] } },
  { name: "export_did", description: "Export DID as encrypted wallet", inputSchema: { type: "object", required: ["did","password"] } },
  { name: "import_dids", description: "Import DIDs", inputSchema: { type: "object", required: ["data"] } },
];

export function getHandlers(dids: DidClient): Map<string, ToolHandler> {
  const handlers = new Map<string, ToolHandler>();

  handlers.set("create_did", async (args) => {
    const { method, document, metadata } = args as any;
    if (!method) return { content: [{ type: "text", text: "Error: 'method' is required" }], isError: true };
    const result = await dids.createDid({ method, ...(document && { document }), ...(metadata && { metadata }) });
    return formatResult(result);
  });

  handlers.set("get_did", async (args) => {
    const { did } = args as any;
    if (!did) return { content: [{ type: "text", text: "Error: 'did' is required" }], isError: true };
    return formatResult(await dids.getDid(did));
  });

  handlers.set("list_dids", async (args) => formatResult(await dids.listDids(args || {})));
  handlers.set("delete_did", async (args) => {
    const { did, fromBlockchain = true } = args as any;
    if (!did) return { content: [{ type: "text", text: "Error: 'did' is required" }], isError: true };
    return formatResult(await dids.deleteDid(did, fromBlockchain));
  });
  handlers.set("export_did", async (args) => {
    const { did, password } = args as any;
    if (!did || !password) return { content: [{ type: "text", text: "Error: 'did' and 'password' are required" }], isError: true };
    return formatResult(await dids.exportDid(did, password));
  });
  handlers.set("import_dids", async (args) => {
    const { data, password } = args as any;
    if (!data) return { content: [{ type: "text", text: "Error: 'data' is required" }], isError: true };
    return formatResult(await dids.importDids(data, password));
  });

  return handlers;
}
