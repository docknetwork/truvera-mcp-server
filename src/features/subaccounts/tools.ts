import type { SubaccountsClient } from "./client.js";
import type { ToolDef, ToolHandler } from "../../tools/types.js";
import { formatResult } from "../../tools/utils.js";

export const toolDefs: ToolDef[] = [
  { name: "create_subaccount", description: "Create subaccount", inputSchema: { type: "object" } },
  { name: "list_subaccounts", description: "List subaccounts", inputSchema: { type: "object" } },
  { name: "get_subaccount", description: "Get subaccount", inputSchema: { type: "object", required: ["id"] } },
  { name: "update_subaccount", description: "Update subaccount", inputSchema: { type: "object" } },
  { name: "delete_subaccount", description: "Delete subaccount", inputSchema: { type: "object", required: ["id"] } },
];

export function getHandlers(subaccounts: SubaccountsClient): Map<string, ToolHandler> {
  const handlers = new Map<string, ToolHandler>();

  handlers.set("create_subaccount", async (args) => formatResult(await subaccounts.createSubaccount(args)));
  handlers.set("list_subaccounts", async () => formatResult(await subaccounts.listSubaccounts()));
  handlers.set("get_subaccount", async (args) => {
    const { id } = args as any;
    if (!id) return { content: [{ type: "text", text: "Error: 'id' is required" }], isError: true };
    return formatResult(await subaccounts.getSubaccount(id));
  });
  handlers.set("update_subaccount", async (args) => {
    const { id, body } = args as any;
    if (!id) return { content: [{ type: "text", text: "Error: 'id' is required" }], isError: true };
    return formatResult(await subaccounts.updateSubaccount(id, body));
  });
  handlers.set("delete_subaccount", async (args) => {
    const { id } = args as any;
    if (!id) return { content: [{ type: "text", text: "Error: 'id' is required" }], isError: true };
    return formatResult(await subaccounts.deleteSubaccount(id));
  });

  return handlers;
}
