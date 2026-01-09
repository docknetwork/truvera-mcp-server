import type { TruveraClient } from "../clients/truvera.js";
import type { ToolDef, ToolHandler } from "./types.js";
import { formatResult } from "./utils.js";

export const toolDefs: ToolDef[] = [
  {
    name: "call_truvera_api",
    description: "Call the Truvera REST API with specified endpoint and parameters. Refer to https://swagger-api.truvera.io/openapi.yaml for complete API documentation and endpoint details.",
    inputSchema: {
      type: "object",
      properties: {
        endpoint: { type: "string" },
        method: { type: "string", enum: ["GET", "POST", "PUT", "DELETE", "PATCH"] },
        payload: { type: "object" },
      },
      required: ["endpoint", "method"],
    },
  },
];

export function getHandlers(truvera: TruveraClient): Map<string, ToolHandler> {
  const handlers = new Map<string, ToolHandler>();

  handlers.set("call_truvera_api", async (args) => {
    const { endpoint, method, payload } = args as any;
    const result = await truvera.request({ method, endpoint, body: payload });
    return formatResult(result);
  });

  return handlers;
}
