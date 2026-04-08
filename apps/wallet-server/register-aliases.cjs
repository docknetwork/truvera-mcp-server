const path = require("path");
const moduleAlias = require("module-alias");

const rootNodeModules = path.resolve(__dirname, "../../node_modules");

moduleAlias.addAliases({
  "@digitalbazaar/did-method-key": path.join(rootNodeModules, "@digitalbazaar/did-method-key/lib/main.js"),
  "@digitalbazaar/did-io": path.join(rootNodeModules, "@digitalbazaar/did-io/lib/main.js"),
  "@digitalbazaar/minimal-cipher": path.join(rootNodeModules, "@digitalbazaar/minimal-cipher/Cipher.js"),
  "@digitalbazaar/x25519-key-agreement-key-2020": path.join(rootNodeModules, "@digitalbazaar/x25519-key-agreement-key-2020/lib/main.js"),
  "@digitalbazaar/x25519-key-agreement-key-2019": path.join(rootNodeModules, "@digitalbazaar/x25519-key-agreement-key-2019/lib/main.js"),
  "@digitalbazaar/ed25519-verification-key-2020": path.join(rootNodeModules, "@digitalbazaar/ed25519-verification-key-2020/lib/main.js"),
  "@digitalbazaar/ed25519-verification-key-2018": path.join(rootNodeModules, "@digitalbazaar/ed25519-verification-key-2018/src/main.js"),
  // Force modern CJS build to avoid legacy `esm` wrapper crashes on Node 24.
  "@digitalbazaar/http-client": path.join(rootNodeModules, "jsonld/node_modules/@digitalbazaar/http-client/dist/cjs/index.cjs"),
});
