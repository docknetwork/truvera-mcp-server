import type { TruveraClient } from "../clients/truvera.js";
import type { ToolDef, ToolHandler } from "./types.js";
import { formatResult } from "./utils.js";

export const toolDefs: ToolDef[] = [];

export function getHandlers(truvera: TruveraClient): Map<string, ToolHandler> {
  const handlers = new Map<string, ToolHandler>();

  handlers.set("call_truvera_api", async (args) => {
    const { endpoint, method, payload } = args as { endpoint?: string; method?: string; payload?: unknown };
    if (!endpoint || !method) {
      console.error(`call_truvera_api missing required 'endpoint': ${endpoint} or 'method': ${method} argument`);
      return { content: [{ type: "text", text: "Error: 'endpoint' and 'method' are required" }], isError: true };
    }
    const result = await truvera.request({ method: method as "GET" | "POST" | "PUT" | "DELETE" | "PATCH", endpoint, body: payload });
    return formatResult(result);
  });

  return handlers;
}
