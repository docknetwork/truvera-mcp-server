#!/usr/bin/env node
/**
 * Fails if `npm audit` finds a HIGH/CRITICAL, fixable vulnerability in a
 * production dependency that isn't already a known, accepted risk.
 *
 * This mirrors (approximately) what the CI Trivy step actually enforces
 * (`ignore-unfixed: true`, `trivyignores: .trivyignore`, image scan only —
 * so devDependencies never appear): `npm audit` has no equivalent of
 * `ignore-unfixed`, and its CVE/GHSA identifiers don't line up with
 * .trivyignore's CVE list, so instead of chasing exact parity this filters
 * by package name against ACCEPTED_RISK below, which should track
 * .trivyignore's package groupings (see that file for the CVE-level detail
 * and the reasoning for each one).
 *
 * Without this filter, `npm audit --omit=dev --audit-level=high` fails on
 * every push that touches package-lock.json, since several transitive
 * dependencies deep in the wallet-sdk/cosmjs/protobufjs chain have no
 * non-breaking fix available and are already deliberately accepted.
 */
import { execSync } from "node:child_process";

// Keep in sync with the package groupings documented in .trivyignore.
// brace-expansion isn't in .trivyignore because it never reaches the built
// image — it's pulled in only by eslint/typescript-eslint/babel-jest
// (devDependencies), but npm's --omit=dev doesn't fully prune it from a
// hoisted workspace tree.
const ACCEPTED_RISK = new Set([
  "axios",
  "@cosmjs/tendermint-rpc", // depends on axios
  "underscore",
  "jsonpath", // depends on underscore
  "@sphereon/pex", // depends on jsonpath
  "brace-expansion", // devDependency-only (eslint/typescript-eslint/babel-jest)
]);

let raw;
try {
  raw = execSync("npm audit --omit=dev --json", { encoding: "utf8", maxBuffer: 1024 * 1024 * 20 });
} catch (err) {
  // npm audit exits non-zero when it finds anything — the JSON is still on stdout.
  raw = err.stdout;
}

if (!raw) {
  console.error("check-audit: no output from `npm audit --omit=dev --json`");
  process.exit(1);
}

const report = JSON.parse(raw);
const vulnerabilities = report.vulnerabilities || {};

const newFindings = Object.values(vulnerabilities).filter(
  (v) => (v.severity === "high" || v.severity === "critical") && v.fixAvailable && !ACCEPTED_RISK.has(v.name)
);

if (newFindings.length === 0) {
  console.log("check-audit: no new fixable HIGH/CRITICAL vulnerabilities in production dependencies.");
  process.exit(0);
}

console.error("check-audit: found new fixable HIGH/CRITICAL vulnerabilities not in the accepted-risk list:");
for (const v of newFindings) {
  console.error(`  - ${v.name} (${v.severity})`);
}
console.error("\nRun `npm audit --omit=dev` for details, then either fix it (npm audit fix / bump the override");
console.error("in package.json) or, if it truly can't be fixed without breaking the SDK, add it to both");
console.error(".trivyignore (with the CVE IDs and reasoning) and ACCEPTED_RISK in scripts/check-audit.js.");
process.exit(1);
