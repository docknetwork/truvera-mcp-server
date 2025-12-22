import type { TemplatesClient } from "../clients/templates.js";
import type { ToolDef, ToolHandler } from "./types.js";
import { formatResult } from "./utils.js";

export const toolDefs: ToolDef[] = [
  { name: "create_template", description: "Create template", inputSchema: { type: "object" } },
  { name: "list_templates", description: "List templates", inputSchema: { type: "object" } },
  { name: "get_template", description: "Get template", inputSchema: { type: "object", required: ["id"] } },
  { name: "update_template", description: "Update template", inputSchema: { type: "object" } },
  { name: "delete_template", description: "Delete template", inputSchema: { type: "object", required: ["id"] } },
];

export function getHandlers(templates: TemplatesClient): Map<string, ToolHandler> {
  const handlers = new Map<string, ToolHandler>();

  handlers.set("create_template", async (args) => formatResult(await templates.createTemplate(args)));
  handlers.set("list_templates", async (args) => formatResult(await templates.listTemplates(args || {})));
  handlers.set("get_template", async (args) => {
    const { id } = args as any;
    if (!id) return { content: [{ type: "text", text: "Error: 'id' is required" }], isError: true };
    return formatResult(await templates.getTemplate(id));
  });
  handlers.set("update_template", async (args) => {
    const { id, body } = args as any;
    if (!id) return { content: [{ type: "text", text: "Error: 'id' is required" }], isError: true };
    return formatResult(await templates.updateTemplate(id, body));
  });
  handlers.set("delete_template", async (args) => {
    const { id } = args as any;
    if (!id) return { content: [{ type: "text", text: "Error: 'id' is required" }], isError: true };
    return formatResult(await templates.deleteTemplate(id));
  });

  return handlers;
}
