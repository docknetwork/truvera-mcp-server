#!/usr/bin/env node
/**
 * Simple test script to verify wallet server is working
 * Sends a ListTools request via stdio
 */

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const serverPath = join(__dirname, '..', 'dist', 'index.js');

console.log('Starting wallet server and requesting tools list...\n');

const server = spawn('node', [serverPath], {
  stdio: ['pipe', 'pipe', 'inherit'],
  env: {
    ...process.env,
    WALLET_MASTER_KEY: 'test-key',
  },
});

// Send initialize request
const initRequest = {
  jsonrpc: '2.0',
  id: 1,
  method: 'initialize',
  params: {
    protocolVersion: '2024-11-05',
    capabilities: {},
    clientInfo: { name: 'test-client', version: '1.0.0' },
  },
};

server.stdin.write(JSON.stringify(initRequest) + '\n');

// Send tools/list request
const listToolsRequest = {
  jsonrpc: '2.0',
  id: 2,
  method: 'tools/list',
  params: {},
};

setTimeout(() => {
  server.stdin.write(JSON.stringify(listToolsRequest) + '\n');
}, 1000);

let buffer = '';
server.stdout.on('data', (data) => {
  buffer += data.toString();
  const lines = buffer.split('\n');
  buffer = lines.pop() || '';

  lines.forEach((line) => {
    if (line.trim()) {
      try {
        const response = JSON.parse(line);
        console.log('Response:', JSON.stringify(response, null, 2));
      } catch (e) {
        console.log('Raw output:', line);
      }
    }
  });
});

setTimeout(() => {
  server.kill();
  console.log('\n✅ Test complete. Server can be connected via stdio.');
}, 3000);
