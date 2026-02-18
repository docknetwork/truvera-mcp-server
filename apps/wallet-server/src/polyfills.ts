/**
 * Browser polyfills for Node.js
 * The wallet-sdk-web package expects browser globals
 */

// @ts-ignore
if (typeof window === "undefined") {
  // @ts-ignore
  global.window = global;
  // @ts-ignore
  global.self = global;
  // @ts-ignore  
  global.document = {
    createElement: () => ({}),
    getElementById: () => null,
  };
  
  // Try to set navigator if it doesn't exist
  try {
    // @ts-ignore
    if (!global.navigator) {
      // @ts-ignore
      global.navigator = {
        userAgent: "node.js",
      };
    }
  } catch (e) {
    // navigator might be read-only, skip
  }
  
  // @ts-ignore
  if (!global.localStorage) {
    // @ts-ignore
    global.localStorage = {
      getItem: () => null,
      setItem: () => {},
      removeItem: () => {},
      clear: () => {},
    };
  }
}
