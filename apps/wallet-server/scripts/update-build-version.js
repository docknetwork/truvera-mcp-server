#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const buildInfoPath = path.join(__dirname, '../src/build-info.ts');
const buildNumberPath = path.join(__dirname, '../.buildnumber');

let buildNumber = process.env.BUILD_NUMBER ? parseInt(process.env.BUILD_NUMBER, 10) : null;

if (!buildNumber || isNaN(buildNumber)) {
  if (fs.existsSync(buildNumberPath)) {
    const content = fs.readFileSync(buildNumberPath, 'utf-8').trim();
    buildNumber = parseInt(content, 10) || 1;
    buildNumber++;
  } else {
    buildNumber = 1;
  }

  fs.writeFileSync(buildNumberPath, String(buildNumber), 'utf-8');
}

const timestamp = new Date().toISOString();
const packageVersion = process.env.npm_package_version || '0.1.0';
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