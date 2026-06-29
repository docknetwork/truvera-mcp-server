#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { spawnSync } from 'child_process';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');
const patchDir = path.join(repoRoot, 'apps/wallet-server/patches');
const nodeModulesDir = path.join(repoRoot, 'node_modules');
const patchPackageBinary = process.platform === 'win32' ? 'patch-package.cmd' : 'patch-package';

function getPackageNameFromPatchFile(fileName) {
  const baseName = fileName.replace(/\.patch$/, '');
  const parts = baseName.split('+');

  if (baseName.startsWith('@') && parts.length >= 3) {
    return `${parts[0]}/${parts[1]}`;
  }

  return parts.slice(0, -1).join('+');
}

function isPatchPackageAvailable() {
  const result = spawnSync(patchPackageBinary, ['--version'], {
    cwd: repoRoot,
    stdio: 'ignore',
  });

  return result.status === 0;
}

if (!fs.existsSync(patchDir)) {
  process.exit(0);
}

if (!isPatchPackageAvailable()) {
  console.log('Skipping wallet patches because patch-package is not available in this install context.');
  process.exit(0);
}

const patchFiles = fs.readdirSync(patchDir).filter((file) => file.endsWith('.patch'));
const installedPatchTargets = patchFiles.filter((file) => {
  const packageName = getPackageNameFromPatchFile(file);
  return packageName && fs.existsSync(path.join(nodeModulesDir, packageName));
});

if (installedPatchTargets.length === 0) {
  console.log('Skipping wallet patches because patched wallet dependencies are not installed.');
  process.exit(0);
}

const result = spawnSync(patchPackageBinary, ['--patch-dir', path.relative(repoRoot, patchDir)], {
  cwd: repoRoot,
  stdio: 'inherit',
});

process.exit(result.status ?? 1);