export type ToolDef = {
  name: string;
  description: string;
  inputSchema?: Record<string, unknown>; // JSON Schema is inherently dynamic
  outputSchema?: Record<string, unknown>; // JSON Schema is inherently dynamic
  title?: string;
};

export type ToolResult = {
  content: Array<{ type: "text"; text: string }>;
  isError?: boolean;
};

export type ToolHandler = (args: unknown) => Promise<ToolResult>;
