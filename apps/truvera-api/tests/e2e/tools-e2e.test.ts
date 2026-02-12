import { describe, it, expect, beforeAll } from 'vitest';
import { buildToolList, buildHandlerMapFromTruvera } from '../../src/tools/composeTools.js';
import { TruveraClient } from '../../src/clients/index.js';
import dotenv from 'dotenv';

// Load test environment variables if present
dotenv.config({ path: '.env.tests' });

const API_KEY = process.env.TRUVERA_API_KEY;
const API_ENDPOINT = process.env.TRUVERA_API_ENDPOINT || 'https://api.truvera.com';

console.log('E2E Test - Truvera API Key:', API_KEY ? 'Provided' : 'Not Provided');

// Skip the suite if no credentials are provided
const shouldRunE2E = !!API_KEY;

describe.skipIf(!shouldRunE2E)('e2e: safe read-only tools against real Truvera API', () => {
  let handlers: Map<string, any>;
  let tools: any[];

  beforeAll(() => {
    const client = new TruveraClient(API_KEY as string, API_ENDPOINT);
    tools = buildToolList();
    handlers = buildHandlerMapFromTruvera(client);
  });

  it('calls list_* tools and returns non-error results', { timeout: 30000 }, async () => {
    // Only run read-only list tools that don't require special input parameters
    // Some list_* endpoints still require path or query params despite having no "required" schema.
    // Maintain a small blacklist of known problematic list tools to avoid 400s in E2E smoke tests.
const blacklistedListTools = new Set<string>();
    const listTools = tools.filter((t) => typeof t.name === 'string' && t.name.startsWith('list_') && !(t.inputSchema && Array.isArray((t as any).inputSchema.required) && (t as any).inputSchema.required.length > 0) && !blacklistedListTools.has(t.name));
    expect(listTools.length).toBeGreaterThan(0);

    for (const tool of listTools) {
      const handler = handlers.get(tool.name);
      expect(handler).toBeDefined();
      console.error(`E2E: invoking ${tool.name} (description=${tool.description || ''})`);

      try {
        const result = await handler({});
        // For e2e smoke we consider a handler successful if it doesn't indicate isError
        expect((result as any).isError).not.toBe(true);
      } catch (err) {
        // Surface useful diagnostic
        throw new Error(`Tool ${tool.name} threw an exception: ${String(err)}`);
      }
    }
  });
});
