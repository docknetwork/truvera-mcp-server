#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const buildInfoPath = path.join(__dirname, '../src/build-info.ts');
const buildNumberPath = path.join(__dirname, '../.buildnumber');

// Check if BUILD_NUMBER was provided as environment variable (from Docker build)
let buildNumber = process.env.BUILD_NUMBER ? parseInt(process.env.BUILD_NUMBER, 10) : null;

if (!buildNumber || isNaN(buildNumber)) {
  // Fall back to reading and incrementing from .buildnumber file (local development)
  if (fs.existsSync(buildNumberPath)) {
    const content = fs.readFileSync(buildNumberPath, 'utf-8').trim();
    buildNumber = parseInt(content, 10) || 1;
    buildNumber++;
  } else {
    buildNumber = 1;
  }
  // Write back the incremented build number (only for local builds)
  fs.writeFileSync(buildNumberPath, String(buildNumber), 'utf-8');
} else {
  // When BUILD_NUMBER is provided (Docker build), just use it without incrementing
  // The .buildnumber file won't be updated since Docker builds are ephemeral
}

const timestamp = new Date().toISOString();
const packageVersion = process.env.npm_package_version || '1.0.0';
const fullVersion = `${packageVersion}-build.${buildNumber}`;

const buildInfo = `// Auto-generated build information
export const BUILD_INFO = {
  timestamp: '${timestamp}',
  buildNumber: ${buildNumber},
  version: '${fullVersion}',
};
`;

fs.writeFileSync(buildInfoPath, buildInfo, 'utf-8');
console.log(`✓ Updated build info: Version ${fullVersion} (${timestamp})`);
