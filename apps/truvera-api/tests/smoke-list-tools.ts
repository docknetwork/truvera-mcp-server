import { buildToolList, buildHandlerMapFromTruvera } from '../src/tools/composeTools.js';
import { TruveraClient } from '../src/clients/index.js';

(async () => {
  try {
    const tools = buildToolList();
    if (!Array.isArray(tools) || tools.length === 0) {
      console.error('FAIL: buildToolList returned no tools');
      process.exit(1);
    }

    // Validate that tools contains the full set and derive expected tool names
    const expectedTools = tools.map((t) => t.name);
    if (!Array.isArray(expectedTools) || expectedTools.length === 0) {
      console.error('FAIL: buildToolList returned no tool names');
      process.exit(1);
    }

    // Sanity check: ensure DIDs tools are included
    const sanity = ['create_did', 'get_did', 'list_dids'];
    for (const name of sanity) {
      if (!expectedTools.includes(name)) {
        console.error(`FAIL: expected tool ${name} not present`);
        process.exit(1);
      }
    }

    // Build handlers using a fake Truvera client
    const handlers = buildHandlerMapFromTruvera(new TruveraClient('test-api-key', 'http://localhost'));

    for (const name of expectedTools) {
      if (!handlers.has(name)) {
        console.error(`FAIL: handler for ${name} missing`);
        process.exit(1);
      }
    }

    console.log('PASS: smoke test succeeded');
  } catch (err) {
    console.error('ERROR during smoke test', err);
    process.exit(1);
  }
})();
