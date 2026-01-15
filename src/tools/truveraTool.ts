import type { TruveraClient } from "../clients/truvera.js";
import type { ToolDef, ToolHandler } from "./types.js";
import { formatResult } from "./utils.js";

export const toolDefs: ToolDef[] = [];

export function getHandlers(truvera: TruveraClient): Map<string, ToolHandler> {
  const handlers = new Map<string, ToolHandler>();

  handlers.set("call_truvera_api", async (args) => {
    const { endpoint, method, payload } = args as any;
    const result = await truvera.request({ method, endpoint, body: payload });
    return formatResult(result);
  });

  return handlers;
}
