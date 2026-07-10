'use strict';
// CJS stub replacing @digitalbazaar/http-client for Node 22+ compatibility.
// The esm v3.2.25 wrapper used by the original package crashes on Node 22+
// with "Function.prototype.apply was called on undefined". Node 22+ ships
// native fetch, so we implement the subset that jsonld's document loader
// needs: httpClient.get(url) → { data: parsedJson }.

const DEFAULT_HEADERS = { Accept: 'application/ld+json, application/json' };

async function _request(url, method, options) {
  const res = await fetch(url, {
    method,
    headers: { ...DEFAULT_HEADERS, ...(options.headers || {}) },
    ...(options.body !== undefined ? { body: JSON.stringify(options.body) } : {}),
  });
  if (!res.ok) {
    const err = new Error(`${method} ${url} failed with status ${res.status}`);
    err.status = res.status;
    throw err;
  }
  const data = await res.json();
  return { data };
}

const httpClient = {
  get: (url, options = {}) => _request(url, 'GET', options),
  post: (url, options = {}) => _request(url, 'POST', options),
  put: (url, options = {}) => _request(url, 'PUT', options),
  patch: (url, options = {}) => _request(url, 'PATCH', options),
  delete: (url, options = {}) => _request(url, 'DELETE', options),
  head: (url, options = {}) => _request(url, 'HEAD', options),
};

module.exports = { httpClient, DEFAULT_HEADERS };
