import { describe, it, expect, vi } from "vitest";
import { serializeSchema, createListToolsHandler, createCallToolHandler } from "../handlers.js";
import type { ToolDef } from "../../tools/types.js";

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
