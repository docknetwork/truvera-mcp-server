const path = require("path");
const moduleAlias = require("module-alias");

const rootNodeModules = path.resolve(__dirname, "../../node_modules");

// These aliases redirect CJS require() calls away from packages that use the
// legacy `esm` wrapper (which crashes on Node 22+) to their native ESM
// main.js files. They work because: (a) module-alias patches the CJS loader,
// and (b) the wallet SDK dependency chain reaches these packages via CJS
// require(), not ESM import. Node 22+ can require() an ESM file natively.
//
// Note: @digitalbazaar/http-client is intentionally omitted. Its only
// consumer in this dependency tree is @digitalbazaar/edv-client, which uses
// ESM import — module-alias cannot patch ESM imports. This is not a problem
// in practice because the wallet server uses local SQLite storage and never
// loads the EDV client code path.
moduleAlias.addAliases({
  "@digitalbazaar/did-method-key": path.join(rootNodeModules, "@digitalbazaar/did-method-key/lib/main.js"),
  "@digitalbazaar/did-io": path.join(rootNodeModules, "@digitalbazaar/did-io/lib/main.js"),
  "@digitalbazaar/minimal-cipher": path.join(rootNodeModules, "@digitalbazaar/minimal-cipher/Cipher.js"),
  "@digitalbazaar/x25519-key-agreement-key-2020": path.join(rootNodeModules, "@digitalbazaar/x25519-key-agreement-key-2020/lib/main.js"),
  "@digitalbazaar/x25519-key-agreement-key-2019": path.join(rootNodeModules, "@digitalbazaar/x25519-key-agreement-key-2019/lib/main.js"),
  "@digitalbazaar/ed25519-verification-key-2020": path.join(rootNodeModules, "@digitalbazaar/ed25519-verification-key-2020/lib/main.js"),
  "@digitalbazaar/ed25519-verification-key-2018": path.join(rootNodeModules, "@digitalbazaar/ed25519-verification-key-2018/src/main.js"),
});
