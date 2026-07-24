import { describe, it, expect, vi } from "vitest";
import { serializeSchema, createListToolsHandler, createCallToolHandler } from "../handlers.js";
import type { ToolDef, ToolResult } from "../../tools/types.js";

describe("serializeSchema", () => {
  it("should return empty object for null", () => {
    expect(serializeSchema(null)).toEqual({});
  });

  it("should return empty object for undefined", () => {
    expect(serializeSchema(undefined)).toEqual({});
  });

  it("should return the schema object as-is for objects", () => {
    const schema = { type: "object", properties: { name: { type: "string" } } };
    expect(serializeSchema(schema)).toEqual(schema);
  });

  it("should return empty object for non-object primitives", () => {
    expect(serializeSchema("string")).toEqual({});
    expect(serializeSchema(123)).toEqual({});
    expect(serializeSchema(true)).toEqual({});
  });

  it("should handle arrays as objects", () => {
    const schema = [{ type: "string" }];
    expect(serializeSchema(schema)).toEqual(schema);
  });
});

describe("createListToolsHandler", () => {
  it("should return a handler that lists tools with all properties", async () => {
    const tools: ToolDef[] = [
      {
        name: "test_tool",
        title: "Test Tool",
        description: "A test tool",
        inputSchema: { type: "object", properties: {} },
      },
    ];

    const handler = createListToolsHandler(tools);
    const result = await handler();

    expect(result).toEqual({
      tools: [
        {
          name: "test_tool",
          title: "Test Tool",
          description: "A test tool",
          inputSchema: { type: "object", properties: {} },
        },
      ],
    });
  });

  it("should use name as title when title is missing", async () => {
    const tools: ToolDef[] = [
      {
        name: "test_tool",
        description: "A test tool",
      },
    ];

    const handler = createListToolsHandler(tools);
    const result = await handler();

    expect(result.tools[0].title).toBe("test_tool");
  });

  it("should set description to null when missing", async () => {
    const tools: ToolDef[] = [
      {
        name: "test_tool",
        description: "Test description",
      },
    ];

    const handler = createListToolsHandler(tools);
    const result = await handler();

    expect(result.tools[0].description).toBe("Test description");
  });

  it("should handle empty inputSchema", async () => {
    const tools: ToolDef[] = [
      {
        name: "test_tool",
        description: "Test tool with no schema",
        inputSchema: undefined,
      },
    ];

    const handler = createListToolsHandler(tools);
    const result = await handler();

    expect(result.tools[0].inputSchema).toEqual({});
  });

  it("should handle multiple tools", async () => {
    const tools: ToolDef[] = [
      { name: "tool1", description: "First tool" },
      { name: "tool2", description: "Second tool" },
      { name: "tool3", description: "Third tool" },
    ];

    const handler = createListToolsHandler(tools);
    const result = await handler();

    expect(result.tools).toHaveLength(3);
    expect(result.tools.map((t) => t.name)).toEqual(["tool1", "tool2", "tool3"]);
  });

  it("should log build number when provided", async () => {
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const tools: ToolDef[] = [{ name: "test_tool", description: "Test tool" }];

    const handler = createListToolsHandler(tools, "123");
    await handler();

    expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining("Build: 123"));
    consoleErrorSpy.mockRestore();
  });
});

describe("createCallToolHandler", () => {
  it("should call the correct tool handler with arguments", async () => {
    const mockHandler = vi.fn().mockResolvedValue({
      content: [{ type: "text", text: "Success" }],
    });

    const toolHandlers = new Map([["test_tool", mockHandler]]);

    const handler = createCallToolHandler(toolHandlers);
    const result = await handler({
      params: {
        name: "test_tool",
        arguments: { key: "value" },
      },
    });

    expect(mockHandler).toHaveBeenCalledWith({ key: "value" });
    expect(result).toEqual({
      content: [{ type: "text", text: "Success" }],
    });
  });

  it("should return error for unknown tool", async () => {
    const toolHandlers = new Map();

    const handler = createCallToolHandler(toolHandlers);
    const result = await handler({
      params: {
        name: "unknown_tool",
        arguments: {},
      },
    });

    expect(result).toEqual({
      content: [
        {
          type: "text",
          text: "Unknown tool: unknown_tool",
        },
      ],
      isError: true,
    });
  });

  it("should handle errors thrown by tool handler", async () => {
    const mockHandler = vi.fn().mockRejectedValue(new Error("Tool execution failed"));

    const toolHandlers = new Map([["test_tool", mockHandler]]);

    const handler = createCallToolHandler(toolHandlers);
    const result = await handler({
      params: {
        name: "test_tool",
        arguments: {},
      },
    });

    expect(result).toEqual({
      content: [
        {
          type: "text",
          text: "Internal server error: Error: Tool execution failed",
        },
      ],
      isError: true,
    });
  });

  it("should handle tool calls with no arguments", async () => {
    const mockHandler = vi.fn().mockResolvedValue({
      content: [{ type: "text", text: "No args" }],
    });

    const toolHandlers = new Map([["test_tool", mockHandler]]);

    const handler = createCallToolHandler(toolHandlers);
    await handler({
      params: {
        name: "test_tool",
      },
    });

    expect(mockHandler).toHaveBeenCalledWith(undefined);
  });

  it("should handle complex argument structures", async () => {
    const mockHandler = vi.fn().mockResolvedValue({
      content: [{ type: "text", text: "Complex" }],
    });

    const complexArgs = {
      nested: {
        array: [1, 2, 3],
        object: { key: "value" },
      },
      bool: true,
      num: 42,
    };

    const toolHandlers = new Map([["test_tool", mockHandler]]);

    const handler = createCallToolHandler(toolHandlers);
    await handler({
      params: {
        name: "test_tool",
        arguments: complexArgs,
      },
    });

    expect(mockHandler).toHaveBeenCalledWith(complexArgs);
  });
});

describe("createCallToolHandler with inputSchema validation", () => {
  const tools: ToolDef[] = [
    {
      name: "schema_tool",
      description: "A tool with an inputSchema",
      inputSchema: {
        type: "object",
        properties: { name: { type: "string" }, count: { type: "integer" } },
        required: ["name"],
      },
    },
  ];

  it("calls the handler when arguments satisfy the inputSchema", async () => {
    const mockHandler = vi.fn().mockResolvedValue({ content: [{ type: "text", text: "ok" }] });
    const toolHandlers = new Map([["schema_tool", mockHandler]]);

    const handler = createCallToolHandler(toolHandlers, tools);
    const result = await handler({
      params: { name: "schema_tool", arguments: { name: "widget", count: 3 } },
    });

    expect(mockHandler).toHaveBeenCalledWith({ name: "widget", count: 3 });
    expect(result).toEqual({ content: [{ type: "text", text: "ok" }] });
  });

  it("rejects arguments missing a required property without calling the handler", async () => {
    const mockHandler = vi.fn().mockResolvedValue({ content: [{ type: "text", text: "ok" }] });
    const toolHandlers = new Map([["schema_tool", mockHandler]]);

    const handler = createCallToolHandler(toolHandlers, tools);
    const result = (await handler({
      params: { name: "schema_tool", arguments: { count: 3 } },
    })) as ToolResult;

    expect(mockHandler).not.toHaveBeenCalled();
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("schema_tool");
    expect(result.content[0].text).toMatch(/name/);
  });

  it("rejects arguments with the wrong type without calling the handler", async () => {
    const mockHandler = vi.fn().mockResolvedValue({ content: [{ type: "text", text: "ok" }] });
    const toolHandlers = new Map([["schema_tool", mockHandler]]);

    const handler = createCallToolHandler(toolHandlers, tools);
    const result = (await handler({
      params: { name: "schema_tool", arguments: { name: "widget", count: "not-a-number" } },
    })) as ToolResult;

    expect(mockHandler).not.toHaveBeenCalled();
    expect(result.isError).toBe(true);
  });

  it("skips validation for a tool with no inputSchema (backward compatible)", async () => {
    const mockHandler = vi.fn().mockResolvedValue({ content: [{ type: "text", text: "ok" }] });
    const toolHandlers = new Map([["no_schema_tool", mockHandler]]);
    const toolsWithoutSchema: ToolDef[] = [{ name: "no_schema_tool", description: "No schema" }];

    const handler = createCallToolHandler(toolHandlers, toolsWithoutSchema);
    await handler({ params: { name: "no_schema_tool", arguments: { anything: "goes" } } });

    expect(mockHandler).toHaveBeenCalledWith({ anything: "goes" });
  });

  it("skips validation entirely when tools is omitted (backward compatible)", async () => {
    const mockHandler = vi.fn().mockResolvedValue({ content: [{ type: "text", text: "ok" }] });
    const toolHandlers = new Map([["schema_tool", mockHandler]]);

    const handler = createCallToolHandler(toolHandlers);
    await handler({ params: { name: "schema_tool", arguments: { anything: "goes" } } });

    expect(mockHandler).toHaveBeenCalledWith({ anything: "goes" });
  });

  it("validates a call with no arguments against a schema with no required properties", async () => {
    const mockHandler = vi.fn().mockResolvedValue({ content: [{ type: "text", text: "ok" }] });
    const toolHandlers = new Map([["optional_tool", mockHandler]]);
    const optionalTools: ToolDef[] = [
      {
        name: "optional_tool",
        description: "All properties optional",
        inputSchema: { type: "object", properties: { name: { type: "string" } } },
      },
    ];

    const handler = createCallToolHandler(toolHandlers, optionalTools);
    await handler({ params: { name: "optional_tool" } });

    expect(mockHandler).toHaveBeenCalledWith(undefined);
  });

  it("rejects a call with no arguments against a schema with required properties", async () => {
    const mockHandler = vi.fn().mockResolvedValue({ content: [{ type: "text", text: "ok" }] });
    const toolHandlers = new Map([["schema_tool", mockHandler]]);

    const handler = createCallToolHandler(toolHandlers, tools);
    const result = (await handler({ params: { name: "schema_tool" } })) as ToolResult;

    expect(mockHandler).not.toHaveBeenCalled();
    expect(result.isError).toBe(true);
  });
});
