export type ToolDef = {
  name: string;
  description: string;
  inputSchema?: unknown;
};

export type ToolResult = {
  content: Array<{ type: string; text: string }>; 
  isError?: boolean;
};

export type ToolHandler = (args: any) => Promise<ToolResult>;
