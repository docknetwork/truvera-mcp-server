import { defineConfig } from "vitest/config";
import path from "path";

const nm = path.resolve(__dirname, "../../node_modules");

export default defineConfig({
  resolve: {
    alias: [
      { find: /^@digitalbazaar\/x25519-key-agreement-key-2020$/, replacement: `${nm}/@digitalbazaar/x25519-key-agreement-key-2020/lib/X25519KeyAgreementKey2020.js` },
      { find: /^@digitalbazaar\/x25519-key-agreement-key-2019$/, replacement: `${nm}/@digitalbazaar/x25519-key-agreement-key-2019/lib/main.js` },
      { find: /^@digitalbazaar\/ed25519-verification-key-2020$/, replacement: `${nm}/@digitalbazaar/ed25519-verification-key-2020/lib/Ed25519VerificationKey2020.js` },
      { find: /^@digitalbazaar\/ed25519-verification-key-2018$/, replacement: `${nm}/@digitalbazaar/ed25519-verification-key-2018/src/Ed25519VerificationKey2018.js` },
      { find: /^@digitalbazaar\/did-method-key$/, replacement: `${nm}/@digitalbazaar/did-method-key/lib/main.js` },
      { find: /^@digitalbazaar\/did-io$/, replacement: `${nm}/@digitalbazaar/did-io/lib/main.js` },
      { find: /^@digitalbazaar\/http-digest-header$/, replacement: `${nm}/@digitalbazaar/http-digest-header/lib/main.js` },
      { find: /^@digitalbazaar\/lru-memoize$/, replacement: `${nm}/@digitalbazaar/lru-memoize/lib/main.js` },
      { find: /^@digitalbazaar\/security-document-loader$/, replacement: `${nm}/@digitalbazaar/security-document-loader/lib/main.js` },
      { find: /^@digitalbazaar\/minimal-cipher$/, replacement: `${nm}/@digitalbazaar/minimal-cipher/Cipher.js` },
    ],
  },
  test: {
    globals: true,
    environment: "node",
    exclude: ["**/node_modules/**", "**/dist/**"],
    // Run integration tests sequentially to avoid database conflicts
    pool: "forks",
    poolOptions: {
      forks: {
        singleFork: true,
      },
    },
  },
});
