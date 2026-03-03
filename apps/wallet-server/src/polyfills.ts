/**
 * Browser polyfills for Node.js
 * The wallet-sdk-web package expects browser globals
 */

console.log('[polyfills] Loading polyfills...');

// Import XMLHttpRequest polyfill for Node.js
// @ts-ignore - xhr2 doesn't have type definitions
import xhr2 from "xhr2";

console.log('[polyfills] xhr2 imported:', typeof xhr2);

// @ts-ignore
if (typeof window === "undefined") {
  console.log('[polyfills] Setting up Node.js browser globals...');
  
  // Set location first
  // @ts-ignore
  global.location = {
    href: 'http://localhost',
    protocol: 'http:',
    host: 'localhost',
    hostname: 'localhost',
    port: '',
    pathname: '/',
    search: '',
    hash: '',
    origin: 'http://localhost',
  };
  
  // Then set window to global (which now has location)
  // @ts-ignore
  global.window = global;
  
  // Explicitly set window.location to ensure it's accessible
  // @ts-ignore
  if (!global.window.location) {
    // @ts-ignore
    global.window.location = global.location;
  }
  
  // @ts-ignore
  global.self = global;
  // @ts-ignore  
  global.document = {
    createElement: (tagName: string) => {
      // Return a mock element that supports setAttribute for URL parsing
      const element: any = {
        tagName: tagName?.toUpperCase(),
        setAttribute: function(name: string, value: string) {
          this[name] = value;
          // For anchor elements, parse the href to set URL properties
          if (tagName === 'a' && name === 'href') {
            try {
              const url = new URL(value, 'http://localhost');
              this.href = url.href;
              this.protocol = url.protocol;
              this.host = url.host;
              this.hostname = url.hostname;
              this.port = url.port;
              this.pathname = url.pathname;
              this.search = url.search;
              this.hash = url.hash;
            } catch (e) {
              this.href = value;
            }
          }
        },
        getAttribute: function(name: string) {
          return this[name];
        },
      };
      return element;
    },
    getElementById: () => null,
  };
  
  // Add XMLHttpRequest support for SDK HTTP requests
  // @ts-ignore
  global.XMLHttpRequest = xhr2;
  // @ts-ignore
  console.log('[polyfills] Set global.XMLHttpRequest to:', typeof global.XMLHttpRequest);
  
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
  
  console.log('[polyfills] Polyfills setup complete');
  console.log('[polyfills] Global checks:');
  // @ts-ignore
  console.log('  - window:', typeof global.window);
  // @ts-ignore
  console.log('  - window.location:', typeof global.window?.location, global.window?.location?.href);
  // @ts-ignore
  console.log('  - global.location:', typeof global.location, global.location?.href);
  // @ts-ignore
  console.log('  - XMLHttpRequest:', typeof global.XMLHttpRequest);
  // @ts-ignore
  console.log('  - navigator:', typeof global.navigator);
}
