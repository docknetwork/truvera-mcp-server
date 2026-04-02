import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createServer } from 'node:net';
import { randomUUID } from 'node:crypto';
import { spawn } from 'node:child_process';
import { access } from 'node:fs/promises';
import { constants } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import dotenv from 'dotenv';

dotenv.config();
dotenv.config({ path: '.env.test', override: true });
dotenv.config({ path: '.env.tests', override: true });

const API_KEY = process.env.TRUVERA_API_KEY;
const API_ENDPOINT = process.env.TRUVERA_API_ENDPOINT || 'https://api.truvera.com';
const shouldRunE2E = !!API_KEY;

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const appDir = resolve(__dirname, '..', '..');
const repoRoot = resolve(appDir, '..', '..');

interface McpJsonRpcResponse {
  jsonrpc: string;
  id: number | string | null;
  result?: unknown;
  error?: {
    code: number;
    message: string;
  };
}

async function parseMcpResponse(response: Response): Promise<McpJsonRpcResponse> {
  const contentType = response.headers.get('content-type') || '';
  const rawBody = await response.text();

  if (contentType.includes('text/event-stream')) {
    const dataLines = rawBody
      .split('\n')
      .filter((line) => line.startsWith('data:'))
      .map((line) => line.slice(5).trim())
      .filter(Boolean);

    const lastPayload = dataLines.at(-1);
    if (!lastPayload) {
      throw new Error(`MCP response stream did not contain a data payload: ${rawBody}`);
    }

    return JSON.parse(lastPayload) as McpJsonRpcResponse;
  }

  return JSON.parse(rawBody) as McpJsonRpcResponse;
}

async function hasDocker(): Promise<boolean> {
  return new Promise((resolvePromise) => {
    const child = spawn('docker', ['version', '--format', '{{.Server.Version}}'], {
      stdio: ['ignore', 'ignore', 'ignore'],
    });

    child.on('error', () => resolvePromise(false));
    child.on('exit', (code) => resolvePromise(code === 0));
  });
}

async function findFreePort(): Promise<number> {
  return new Promise((resolvePromise, reject) => {
    const server = createServer();
    server.unref();
    server.on('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      if (!address || typeof address === 'string') {
        server.close(() => reject(new Error('Unable to determine a free TCP port')));
        return;
      }

      server.close((closeError) => {
        if (closeError) {
          reject(closeError);
          return;
        }
        resolvePromise(address.port);
      });
    });
  });
}

async function ensureEnvFileExists(): Promise<void> {
  await access(resolve(appDir, '.env'), constants.F_OK);
}

async function runDocker(args: string[], env: NodeJS.ProcessEnv): Promise<{ stdout: string; stderr: string; code: number | null }> {
  return new Promise((resolvePromise, reject) => {
    const child = spawn('docker', args, {
      cwd: repoRoot,
      env,
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (chunk) => {
      stdout += chunk.toString();
    });

    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });

    child.on('error', reject);
    child.on('close', (code) => resolvePromise({ stdout, stderr, code }));
  });
}

async function waitForHealth(baseUrl: string, timeoutMs: number): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  let lastError = 'unknown error';

  while (Date.now() < deadline) {
    try {
      const response = await fetch(`${baseUrl}/health`);
      if (response.ok) {
        return;
      }
      lastError = `health returned ${response.status}`;
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error);
    }

    await new Promise((resolvePromise) => setTimeout(resolvePromise, 1000));
  }

  throw new Error(`Timed out waiting for MCP server health check: ${lastError}`);
}

async function initializeSession(baseUrl: string): Promise<string> {
  const response = await fetch(`${baseUrl}/mcp`, {
    method: 'POST',
    headers: {
      accept: 'application/json, text/event-stream',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'initialize',
      params: {
        protocolVersion: '2024-11-05',
        capabilities: {},
        clientInfo: { name: 'vitest-e2e', version: '1.0.0' },
      },
    }),
  });

  const payload = await parseMcpResponse(response);
  if (!response.ok || payload.error) {
    throw new Error(`MCP initialize failed: ${JSON.stringify(payload)}`);
  }

  const sessionId = response.headers.get('mcp-session-id');
  if (!sessionId) {
    throw new Error('MCP initialize did not return an mcp-session-id header');
  }

  return sessionId;
}

async function listTools(baseUrl: string, sessionId: string): Promise<McpJsonRpcResponse> {
  const response = await fetch(`${baseUrl}/mcp`, {
    method: 'POST',
    headers: {
      accept: 'application/json, text/event-stream',
      'content-type': 'application/json',
      'mcp-session-id': sessionId,
    },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 2,
      method: 'tools/list',
      params: {},
    }),
  });

  return parseMcpResponse(response);
}

async function callTool(baseUrl: string, sessionId: string, name: string, args: Record<string, unknown>): Promise<McpJsonRpcResponse> {
  const response = await fetch(`${baseUrl}/mcp`, {
    method: 'POST',
    headers: {
      accept: 'application/json, text/event-stream',
      'content-type': 'application/json',
      'mcp-session-id': sessionId,
    },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 3,
      method: 'tools/call',
      params: {
        name,
        arguments: args,
      },
    }),
  });

  return parseMcpResponse(response);
}

describe.skipIf(!shouldRunE2E)('e2e: MCP server in Docker', () => {
  let containerName = '';
  let baseUrl = '';
  let dockerEnv: NodeJS.ProcessEnv = process.env;

  beforeAll(async () => {
    if (!(await hasDocker())) {
      throw new Error('Docker is required for MCP e2e tests but is not available');
    }

    await ensureEnvFileExists();

    const hostPort = await findFreePort();
    containerName = `truvera-mcp-e2e-${randomUUID().slice(0, 8)}`;
    baseUrl = `http://127.0.0.1:${hostPort}`;
    dockerEnv = {
      ...process.env,
      TRUVERA_API_KEY: API_KEY,
      TRUVERA_API_ENDPOINT: API_ENDPOINT,
    };

    const initialRun = await runDocker(
      [
        'run',
        '--rm',
        '--detach',
        '--name',
        containerName,
        '-e',
        `TRUVERA_API_KEY=${API_KEY}`,
        '-e',
        `TRUVERA_API_ENDPOINT=${API_ENDPOINT}`,
        '-e',
        'MCP_MODE=http',
        '-e',
        'MCP_PORT=3000',
        '-p',
        `${hostPort}:3000`,
        'truvera-api-mcp:latest',
      ],
      dockerEnv,
    );

    if (initialRun.code !== 0) {
      const buildResult = await runDocker(
        [
          'build',
          '--build-arg',
          `BUILD_NUMBER=${process.env.BUILD_NUMBER || 'e2e'}`,
          '-t',
          'truvera-api-mcp:latest',
          '-f',
          'apps/truvera-api/Dockerfile',
          '.',
        ],
        dockerEnv,
      );

      if (buildResult.code !== 0) {
        throw new Error(`Docker build failed:\n${buildResult.stderr || buildResult.stdout}`);
      }

      const retryRun = await runDocker(
        [
          'run',
          '--rm',
          '--detach',
          '--name',
          containerName,
          '-e',
          `TRUVERA_API_KEY=${API_KEY}`,
          '-e',
          `TRUVERA_API_ENDPOINT=${API_ENDPOINT}`,
          '-e',
          'MCP_MODE=http',
          '-e',
          'MCP_PORT=3000',
          '-p',
          `${hostPort}:3000`,
          'truvera-api-mcp:latest',
        ],
        dockerEnv,
      );

      if (retryRun.code !== 0) {
        throw new Error(`Docker run failed:\n${retryRun.stderr || retryRun.stdout}`);
      }
    }

    await waitForHealth(baseUrl, 90000);
  }, 180000);

  afterAll(async () => {
    if (!containerName) {
      return;
    }

    await runDocker(['rm', '-f', containerName], dockerEnv);
  }, 30000);

  it('serves health, tools/list, and tools/call over MCP HTTP transport', { timeout: 60000 }, async () => {
    const healthResponse = await fetch(`${baseUrl}/health`);
    expect(healthResponse.ok).toBe(true);

    const health = await healthResponse.json() as { status?: string; toolCount?: number };
    expect(health.status).toBe('ok');
    expect(typeof health.toolCount).toBe('number');
    expect((health.toolCount ?? 0) > 0).toBe(true);

    const sessionId = await initializeSession(baseUrl);
    const toolsResponse = await listTools(baseUrl, sessionId);

    expect(toolsResponse.error).toBeUndefined();
    expect(toolsResponse.result).toBeDefined();

    const result = toolsResponse.result as { tools?: Array<{ name?: string }> };
    expect(Array.isArray(result.tools)).toBe(true);
    expect((result.tools ?? []).length).toBeGreaterThan(0);
    expect((result.tools ?? []).some((tool) => tool.name === 'list_dids')).toBe(true);

    const callResponse = await callTool(baseUrl, sessionId, 'list_dids', {});
    expect(callResponse.error).toBeUndefined();
    expect(callResponse.result).toBeDefined();

    const callResult = callResponse.result as {
      content?: Array<{ type?: string; text?: string }>;
      isError?: boolean;
    };
    expect(callResult.isError).not.toBe(true);
    expect(Array.isArray(callResult.content)).toBe(true);
    expect(callResult.content?.[0]?.type).toBe('text');
    expect(typeof callResult.content?.[0]?.text).toBe('string');
    expect(callResult.content?.[0]?.text?.length).toBeGreaterThan(0);
  });
});
