export type ToolDef = {
  name: string;
  description: string;
  inputSchema?: any; // JSON Schema is inherently dynamic
  outputSchema?: any; // JSON Schema is inherently dynamic
  title?: string;
};

export type ToolResult = {
  content: Array<{ type: "text"; text: string }>;
  isError?: boolean;
};

export type ToolHandler = (args: unknown) => Promise<ToolResult>;
