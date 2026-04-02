import type { DidClient } from "./client.js";
import type { ToolDef, ToolHandler } from "@truvera/mcp-shared/tools";
import { formatResult } from "../../tools/utils.js";
import { components } from "./schemas.js";
import { CreateDidRequest } from "./types.js";

export const toolDefs: ToolDef[] = [
  { name: "create_did", description: "Create a Decentralized Identifier (DID) in Truvera. POST /dids. For schema details, refer to the Truvera API spec: https://swagger-api.truvera.io/openapi.yaml", inputSchema: components.schemas.CreateDidRequest },
  { name: "get_did", description: "Get a DID by its identifier. GET /dids/{did}. For schema details, refer to the Truvera API spec: https://swagger-api.truvera.io/openapi.yaml", inputSchema: components.schemas.GetDidRequest },
  { name: "list_dids", description: "List DIDs. GET /dids. Supports offset and limit pagination. For schema details, refer to the Truvera API spec: https://swagger-api.truvera.io/openapi.yaml", inputSchema: components.schemas.ListDidsOptions },
  { name: "delete_did", description: "Delete a DID. DELETE /dids/{did}. For schema details, refer to the Truvera API spec: https://swagger-api.truvera.io/openapi.yaml", inputSchema: components.schemas.DeleteDidRequest },
  { name: "export_did", description: "Export DID as encrypted wallet. POST /dids/{did}/export. For schema details, refer to the Truvera API spec: https://swagger-api.truvera.io/openapi.yaml", inputSchema: components.schemas.ExportDidRequest },
  { name: "import_dids", description: "Import DIDs. POST /dids/import. For schema details, refer to the Truvera API spec: https://swagger-api.truvera.io/openapi.yaml", inputSchema: components.schemas.ImportDidsRequest },
];

export function getHandlers(dids: DidClient): Map<string, ToolHandler> {
  const handlers = new Map<string, ToolHandler>();

  handlers.set("create_did", async (args) => {
    const createRequest = args as CreateDidRequest;
    const result = await dids.createDid(createRequest);
    return formatResult(result);
  });

  handlers.set("get_did", async (args) => {
    const { did } = args as { did?: string };
    if (!did) return { content: [{ type: "text", text: "Error: 'did' is required" }], isError: true };
    return formatResult(await dids.getDid(did));
  });

  handlers.set("list_dids", async (args) => formatResult(await dids.listDids(args || {})));
  handlers.set("delete_did", async (args) => {
    const { did, fromBlockchain = true } = args as { did?: string; fromBlockchain?: boolean };
    if (!did) return { content: [{ type: "text", text: "Error: 'did' is required" }], isError: true };
    return formatResult(await dids.deleteDid(did, fromBlockchain));
  });
  handlers.set("export_did", async (args) => {
    const { did, password } = args as { did?: string; password?: string };
    if (!did || !password) return { content: [{ type: "text", text: "Error: 'did' and 'password' are required" }], isError: true };
    return formatResult(await dids.exportDid(did, password));
  });
  handlers.set("import_dids", async (args) => {
    const { data, password } = args as { data?: string; password?: string };
    if (!data) return { content: [{ type: "text", text: "Error: 'data' is required" }], isError: true };
    return formatResult(await dids.importDids(data, password));
  });

  return handlers;
}
