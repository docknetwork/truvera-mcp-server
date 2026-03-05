# Truvera MCP Server - Developer Instructions

## Overview

This MCP server enables Claude to interact with the Truvera API for verifiable credentials, DIDs, and AP2 (Agent Payments Protocol) mandates. Follow these guidelines for consistent development practices.

## Architecture Patterns

### Feature-Based Structure

Each feature lives in `src/features/<feature>/` with:
- `client.ts` - API client wrapping TruveraClient
- `tools.ts` - MCP tool definitions and handlers
- `schemas.ts` - JSON Schema for tool inputs
- `types.ts` - TypeScript interface definitions
- `tests/` - Unit, integration, and E2E tests

Example:
```
src/features/ap2/
├── client.ts          # AP2Client with mandate methods
├── tools.ts           # MCP tools for AP2
├── schemas.ts         # Input schemas for tools
├── types.ts           # TypeScript types
├── schemas/           # JSON-LD contexts & JSON Schemas
└── tests/
    ├── unit/
    ├── integration/
    └── e2e/
```

### Shared Code

Common types and utilities go in `src/features/shared/`:
- `credentials.ts` - W3C VC types
- `did.ts` - DID-related types
- `errors.ts` - Error handling
- `pagination.ts` - Pagination patterns

## Testing Practices

### Test-Driven Development (TDD)

Always write E2E tests for API integrations. They catch real bugs before production:

```typescript
// 1. Write the test
it('should issue a cart mandate', async () => {
  const response = await ap2Client.issueCartMandate({...});
  expect(response.success).toBe(true);
});

// 2. Run test - it will fail and reveal API requirements
// 3. Fix implementation based on actual API behavior
// 4. Verify test passes
```

**Real Example**: Our E2E tests immediately revealed that the Truvera API requires W3C VC format with a `credential` wrapper, catching a bug before deployment.

### E2E Test Best Practices

#### 1. **Always Clean Up Resources**

Use `afterAll` hooks to delete created credentials/DIDs:

```typescript
describe('e2e: Feature tests', () => {
  let client: FeatureClient;
  const createdResourceIds: string[] = [];
  
  afterAll(async () => {
    console.log('Cleaning up test resources...');
    for (const id of createdResourceIds) {
      await client.deleteResource(id);
    }
  });
  
  it('creates a resource', async () => {
    const result = await client.createResource({...});
    createdResourceIds.push(result.data.id); // Track for cleanup
  });
});
```

#### 2. **Environment Configuration**

Load `.env` first, then allow test overrides:

```typescript
dotenv.config();                                      // Load .env
dotenv.config({ path: '.env.test', override: true }); // Test overrides
```

Store test DIDs in environment variables:
```bash
# .env or .env.test
TRUVERA_API_KEY=your_key
TRUVERA_API_ENDPOINT=https://api-testnet.truvera.io
TRUVERA_API_ISSUER_DID=did:cheqd:testnet:xxx
TRUVERA_API_SUBJECT_DID=did:cheqd:testnet:yyy
```

#### 3. **Skip Tests Without a Valid API Key**

```typescript
const shouldRunE2E = !!process.env.TRUVERA_API_KEY;
describe.skipIf(!shouldRunE2E)('e2e tests', () => {
  // Tests only run if API key is provided
});
```

#### 4. **Timeouts for Real API Calls**

```typescript
it('calls slow API', { timeout: 30000 }, async () => {
  // 30 second timeout for network calls
});
```

## W3C Verifiable Credentials Format

### Critical: Always Use Proper W3C VC Structure

The Truvera API expects W3C Verifiable Credentials format:

```typescript
// ✅ CORRECT Format
{
  credential: {
    "@context": [
      "https://www.w3.org/2018/credentials/v1",
      "https://schema.yourorg.com/credential-v1.json"
    ],
    type: ["VerifiableCredential", "YourCredentialType"],
    issuer: {
      id: "did:cheqd:testnet:xxx"  // Object with id property
    },
    credentialSubject: {
      id: "did:cheqd:testnet:yyy",
      // ... your subject data
    }
  }
}

// ❌ WRONG Format (will fail with 400 Bad Request)
{
  schema: "https://schema.yourorg.com/...",
  type: ["VerifiableCredential", "YourCredentialType"],
  issuer: "did:cheqd:testnet:xxx",  // String instead of object
  subject: {...}                     // 'subject' instead of 'credentialSubject'
}
```

### Verification

When verifying credentials, pass the **full VC document or a verifiable presentation**, not metadata:

```typescript
// ✅ CORRECT - Use the credential from issuance
const issueResponse = await client.issueCredential({...});
const credential = issueResponse.data;  // Full W3C VC document
await verifyClient.verify(credential);

// ❌ WRONG - Don't fetch by ID and use metadata
const credentialId = issueResponse.data.id;
const metadata = await client.getCredential(credentialId);  // Returns metadata
await verifyClient.verify(metadata);  // Will fail - wrong format
```

## Schema Management

### JSON-LD vs JSON Schema

Use **both** for complete schema definitions:

#### JSON-LD Context (Semantic)
Defines the semantic meaning of properties:

```json
{
  "@context": {
    "@vocab": "https://schema.yourorg.com/ap2#",
    "schema": "https://schema.org/",
    "xsd": "http://www.w3.org/2001/XMLSchema#",
    
    "mandateId": {
      "@id": "schema:identifier",
      "@type": "xsd:string"
    },
    "amount": {
      "@id": "schema:MonetaryAmount"
    }
  }
}
```

Store in: `src/features/<feature>/schemas/<name>-v1.json`

#### JSON Schema (Validation)
Defines the structure and validation rules:

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "properties": {
    "mandateId": { "type": "string" },
    "amount": {
      "type": "object",
      "properties": {
        "currency": { "type": "string" },
        "value": { "type": "number" }
      },
      "required": ["currency", "value"]
    }
  },
  "required": ["mandateId", "amount"]
}
```

Store in: `src/features/<feature>/schemas/<name>-schema.json`

### Inline Properties

Avoid `$ref` and `$defs` in JSON Schemas - inline all properties for simplicity:

```json
// ✅ Good - Inlined
{
  "properties": {
    "address": {
      "type": "object",
      "properties": {
        "street": { "type": "string" },
        "city": { "type": "string" }
      }
    }
  }
}

// ❌ Avoid - Requires separate definitions
{
  "properties": {
    "address": { "$ref": "#/$defs/Address" }
  },
  "$defs": {
    "Address": { ... }
  }
}
```

## API Client Patterns

### Use TruveraClient for All API Calls

```typescript
export class FeatureClient {
  private truveraClient: TruveraClient;
  
  constructor(truveraClient: TruveraClient) {
    this.truveraClient = truveraClient;
  }
  
  async createResource(request: CreateRequest): Promise<ApiResponse> {
    return this.truveraClient.request({
      method: "POST",
      endpoint: "/resources",
      body: {
        credential: {  // W3C VC wrapper
          "@context": [...],
          type: [...],
          issuer: { id: request.issuer_did },
          credentialSubject: { ... }
        }
      }
    });
  }
}
```

### URL Encoding

Always encode URL parameters:

```typescript
async getResource(id: string): Promise<ApiResponse> {
  return this.truveraClient.request({
    method: "GET",
    endpoint: `/resources/${encodeURIComponent(id)}`
  });
}
```

## Environment Variables

### Required Variables

```bash
TRUVERA_API_KEY=your_api_key_here
TRUVERA_API_ENDPOINT=https://api-testnet.truvera.io  # or production
```

### Feature-Specific Variables

```bash
# AP2 Configuration
AP2_ENABLED=true
AP2_DEFAULT_TTL_SECONDS=3600
AP2_CART_MANDATE_SCHEMA_URL=https://schema.yourorg.com/cart-v1.json
AP2_INTENT_MANDATE_SCHEMA_URL=https://schema.yourorg.com/intent-v1.json
AP2_PAYMENT_MANDATE_SCHEMA_URL=https://schema.yourorg.com/payment-v1.json
```

### Test Variables

```bash
# Test DIDs (in .env.test)
TRUVERA_API_ISSUER_DID=did:cheqd:testnet:xxx
TRUVERA_API_SUBJECT_DID=did:cheqd:testnet:yyy
```

## Common Pitfalls & Solutions

### 1. **"must have required property 'credential'"**

**Problem**: Not wrapping VC in `credential` object.

**Solution**: Always wrap in `{ credential: { ... } }` for POST /credentials.

### 2. **"must match format 'uri'"**

**Problem**: Not URL-encoding credential IDs.

**Solution**: Use `encodeURIComponent(id)` for all URL parameters.

### 3. **Verification returns `verified: false`**

**Problem**: Passing credential metadata instead of W3C VC document.

**Solution**: Use the credential returned from issuance, don't fetch by ID.

### 4. **Tests leave resources in testnet**

**Problem**: No cleanup after tests.

**Solution**: Always use `afterAll` hooks to delete created resources.

### 5. **Environment variables not loading**

**Problem**: Wrong dotenv loading order.

**Solution**: Load `.env` first, then `.env.test` with override flag.

## Code Quality

### Preferred Patterns
- Use async/await instead of promises
- Use try/catch for error handling
- Use TypeScript interfaces for request/response types
- Log API requests and responses for debugging
- Write comprehensive E2E tests for all API interactions
- Follow coding practices like SOLID, DRY, and KISS principles

### TypeScript Strict Mode

Enable strict type checking:

```json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true
  }
}
```

### Error Handling

Return structured responses:

```typescript
async operation(): Promise<ApiResponse> {
  try {
    const result = await this.truveraClient.request({...});
    return result;
  } catch (error) {
    return {
      success: false,
      error: `Operation failed: ${error.message}`
    };
  }
}
```

### Logging

Log API requests for debugging:

```typescript
console.log(`TruveraClient request -> ${method} ${url}`);
console.log(`TruveraClient response -> status=${status} body=${body}`);
```

## Development Workflow

### 1. Define Types

```typescript
// types.ts
export interface CreateMandateRequest {
  mandate_id: string;
  issuer_did: string;
  subject_did: string;
  // ...
}
```

### 2. Create Client Method

```typescript
// client.ts
async issueMandate(request: CreateMandateRequest): Promise<ApiResponse> {
  return this.truveraClient.request({
    method: "POST",
    endpoint: "/credentials",
    body: { credential: { /* W3C VC */ } }
  });
}
```

### 3. Write E2E Test

```typescript
// tests/e2e/feature-e2e.test.ts
it('should issue mandate', async () => {
  const response = await client.issueMandate({...});
  expect(response.success).toBe(true);
  createdIds.push(response.data.id);  // Track for cleanup
});
```

### 4. Run Test & Fix

```bash
npm test -- feature-e2e --run
```

Test will reveal exact API requirements.

### 5. Create MCP Tools

```typescript
// tools.ts
export const toolDefs = [
  {
    name: "issue_mandate",
    description: "Issue an AP2 mandate credential",
    inputSchema: schemas.IssueMandateRequest
  }
];

export function getHandlers(client: FeatureClient): Map<string, ToolHandler> {
  const handlers = new Map();
  handlers.set("issue_mandate", async (args) => {
    return formatResult(await client.issueMandate(args));
  });
  return handlers;
}
```

## Documentation

### README Updates

When adding features, update:
- `README.md` - Feature overview
- `schemas/SCHEMAS.md` - Schema documentation
- Examples in markdown with actual usage

### Code Comments

```typescript
/**
 * Issue a cart mandate credential.
 * 
 * Creates a W3C Verifiable Credential representing a shopping cart
 * that requires human signature for payment processing.
 * 
 * @param request - Cart mandate details including items and payment info
 * @returns API response with issued credential or error
 */
async issueCartMandate(request: IssueCartMandateRequest): Promise<ApiResponse> {
  // Implementation
}
```

## Git Workflow

### Commits

Use conventional commits:
```
feat: add cart mandate issuance
fix: correct W3C VC format in AP2Client
test: add E2E tests with cleanup
docs: document schema types
```

### Testing Before Commit

```bash
npm run typecheck   # No TypeScript errors
npm run lint        # No linting errors
npm test            # All tests pass (unit + E2E)
```

## Resources

- [W3C Verifiable Credentials](https://www.w3.org/TR/vc-data-model/)
- [JSON-LD](https://json-ld.org/)
- [JSON Schema](https://json-schema.org/)
- [Truvera API Docs](https://swagger-api.truvera.io/)
- [MCP Specification](https://spec.modelcontextprotocol.io/)

## Questions?

When in doubt:
1. Check existing features for patterns
2. Write E2E tests - they reveal the truth
3. Look at API responses - they show the format
4. Read W3C VC spec for credential structure
5. Clean up your test resources!
