export type ToolDef = {
  name: string;
  description: string;
  inputSchema?: any;
  outputSchema?: any;
  title?: string;
};

export type ToolResult = {
  content: Array<{ type: "text"; text: string }>;
  isError?: boolean;
};

export type ToolHandler = (args: any) => Promise<ToolResult>;
