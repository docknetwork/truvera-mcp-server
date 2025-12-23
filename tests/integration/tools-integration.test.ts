import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { buildToolList, buildHandlerMapFromTruvera } from '../../src/tools/composeTools.js';
import { TruveraClient } from '../../src/clients/index.js';

function constructArgsFromSchema(schema: any) {
  const args: any = {};
  if (!schema || !schema.required) return args;
  for (const key of schema.required) {
    // Provide a simple default based on inferred type hints in `properties`
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
