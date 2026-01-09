import type { PresentationsClient } from "./client.js";
import type { ToolDef, ToolHandler } from "../../tools/types.js";
import { formatResult } from "../../tools/utils.js";
import { components } from "./schemas.js";

export const toolDefs: ToolDef[] = [
  { name: "list_proof_templates", description: "List proof templates. GET /proof-templates. Supports offset and limit pagination. For schema details, refer to the Truvera API spec: https://swagger-api.truvera.io/openapi.yaml", inputSchema: components.schemas.ListProofTemplatesOptions },
  { name: "create_proof_template", description: "Create proof template. POST /proof-templates. ⚠️ IMPORTANT: Proof request structure in Truvera may differ from standard Indy/W3C conventions. ALWAYS check the Truvera API spec for exact field names, attribute specification format, and request object structure: https://swagger-api.truvera.io/openapi.yaml", inputSchema: components.schemas.CreateProofTemplateRequest },
  { name: "get_proof_template", description: "Get proof template by ID. GET /proof-templates/{id}. For schema details, refer to the Truvera API spec: https://swagger-api.truvera.io/openapi.yaml", inputSchema: components.schemas.GetProofTemplateRequest },
  { name: "create_proof_request", description: "Create proof request from template. POST /proof-templates/{templateId}/request. ⚠️ IMPORTANT: Proof request structure in Truvera may differ from standard Indy/W3C conventions. ALWAYS check the Truvera API spec for exact field names, attribute specification format, and request object structure: https://swagger-api.truvera.io/openapi.yaml", inputSchema: components.schemas.CreateProofRequest },
];

export function getHandlers(presentations: PresentationsClient): Map<string, ToolHandler> {
  const handlers = new Map<string, ToolHandler>();

  handlers.set("list_proof_templates", async (args) => formatResult(await presentations.listProofTemplates(args || {})));
  handlers.set("create_proof_template", async (args) => formatResult(await presentations.createProofTemplate(args)));
  handlers.set("get_proof_template", async (args) => {
    const { id } = args as any;
    if (!id) return { content: [{ type: "text", text: "Error: 'id' is required" }], isError: true };
    return formatResult(await presentations.getProofTemplate(id));
  });
  handlers.set("create_proof_request", async (args) => {
    const { templateId, body } = args as any;
    if (!templateId) return { content: [{ type: "text", text: "Error: 'templateId' is required" }], isError: true };
    return formatResult(await presentations.createProofRequest(templateId, body));
  });

  return handlers;
}
