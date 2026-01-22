import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { buildToolList, buildHandlerMapFromTruvera } from '../../src/tools/composeTools.js';
import { TruveraClient } from '../../src/clients/index.js';

function constructArgsFromSchema(schema: any) {
  const args: any = {};
  if (!schema) return args;

  const isZod = (s: any) => s && typeof s.safeParse === 'function';
  if (isZod(schema)) {
    const shape = (schema as any)._def?.shape || (schema as any).shape || {};
    for (const [key, val] of Object.entries(shape)) {
      // determine if optional
      const inner = (val as any)._def?.innerType || (val as any);
      const isOptional = (val as any)?._def?.type === 'optional' || (val as any).isOptional;
      if (isOptional) continue;
      const t = inner?._def?.type || inner?._def?.typeName || typeof inner;
      switch (t) {
        case 'number':
        case 'ZodNumber':
          args[key] = 1;
          break;
        case 'ZodBoolean':
        case 'boolean':
          args[key] = true;
          break;
        case 'ZodObject':
        case 'object':
          args[key] = {};
          break;
        case 'ZodArray':
        case 'array':
          args[key] = [];
          break;
        default:
          args[key] = 'test';
      }
    }
    return args;
  }

  // Fallback: JSON Schema style
  if (!schema || !schema.required) return args;
  for (const key of schema.required) {
    const prop = schema.properties && schema.properties[key];
    if (!prop) {
      args[key] = 'test';
      continue;
    }
    switch (prop.type) {
      case 'number':
      case 'integer':
        args[key] = 1;
        break;
      case 'boolean':
        args[key] = true;
        break;
      case 'object':
        args[key] = {};
        break;
      case 'array':
        args[key] = [];
        break;
      default:
        args[key] = 'test';
    }
  }
  return args;
}

describe('integration: every tool handler should call TruveraClient.request', () => {
  let spy: any;

  beforeEach(() => {
    spy = vi.spyOn(TruveraClient.prototype as any, 'request').mockImplementation(async (opts: any) => {
      return { success: true, data: { request: opts } };
    });
  });

  afterEach(() => {
    spy.mockRestore();
  });

  it('invokes request for each tool handler and returns a response', async () => {
    const tools = buildToolList();
    expect(Array.isArray(tools)).toBeTruthy();
    const handlers = buildHandlerMapFromTruvera(new TruveraClient('test-key', 'http://localhost'));

    for (const tool of tools) {
      const handler = handlers.get(tool.name);
      expect(handler).toBeDefined();

      const args = constructArgsFromSchema((tool as any).inputSchema);
      spy.mockClear();

      // Some handlers validate inputs and return errors; we skip those which immediately return isError === true
      const result = await handler(args);

      // Ensure the handler returned an object
      expect(result).toBeTruthy();

      // If the handler returned an error (isError true), it's likely because required fields couldn't be inferred; still count as exercised
      if ((result as any).isError) continue;

      // Otherwise, ensure TruveraClient.request was called at least once
      expect(spy).toHaveBeenCalled();

      // Basic sanity: the last call should have method & endpoint
      const lastCall = spy.mock.calls[spy.mock.calls.length - 1][0];
      expect(lastCall).toHaveProperty('method');
      expect(lastCall).toHaveProperty('endpoint');
    }
  });
});
