# AP2 (Agent Payments Protocol) Integration

This directory contains AP2 mandate support for the Truvera MCP server. AP2 is an open protocol for secure agent-to-agent payment authorization using Verifiable Digital Credentials.

## Overview

AP2 enables AI agents to make purchases on behalf of users through cryptographically signed mandates that prove authorization, authenticity, and accountability. The protocol addresses the fundamental trust problem in agent commerce where current payment systems assume direct human interaction.

- **Specification**: https://ap2-protocol.org/specification/
- **Repository**: https://github.com/google-agentic-commerce/AP2

## Three Mandate Types

### 1. Cart Mandate (Human-Present)
Used when the user is present to approve a specific cart with exact items and prices.

```typescript
// Example: Issue a cart mandate
{
  "mandate_id": "cart_12345",
  "cart_items": [
    { "label": "Nike Shoes", "currency": "USD", "value": 120 }
  ],
  "total_amount": { "currency": "USD", "value": 120 },
  "payment_method": "CARD",
  "merchant_id": "did:example:merchant",
  "payer_id": "did:example:payer",
  "issuer_did": "did:cheqd:testnet:issuer-id",
  "subject_did": "did:cheqd:testnet:subject-id"
}
```

### 2. Intent Mandate (Human-Not-Present)
Pre-authorization for an agent to act within constraints when the user is not present.

```typescript
// Example: Issue an intent mandate
{
  "mandate_id": "intent_12345",
  "shopping_prompt": "Buy concert tickets when they go on sale, close to main stage, budget $1000",
  "budget_max_currency": "USD",
  "budget_max_value": 1000,
  "ttl_seconds": 86400,
  "product_categories": ["event-tickets"],
  "payer_id": "did:example:payer",
  "issuer_did": "did:cheqd:testnet:issuer-id",
  "subject_did": "did:cheqd:testnet:subject-id"
}
```

### 3. Payment Mandate (Network Visibility)
Separate VDC for payment networks showing agent involvement and transaction modality.

```typescript
// Example: Issue a payment mandate
{
  "payment_mandate_id": "pm_12345",
  "payment_details_id": "cart_12345",
  "total_currency": "USD",
  "total_value": 120,
  "payment_method": "CARD",
  "merchant_agent": "MerchantAgent",
  "shopping_agent": "ShoppingAgent",
  "human_present": true,
  "issuer_did": "did:cheqd:testnet:issuer-id",
  "subject_did": "did:cheqd:testnet:subject-id"
}
```

## Configuration

Set these environment variables in your `.env` file:

```bash
# Required
TRUVERA_API_KEY=your_api_key_here

# Optional - AP2 Configuration
AP2_ENABLED=true  # Set to false to disable AP2 support
AP2_DEFAULT_TTL_SECONDS=3600  # Default time-to-live for intent mandates

# Schema URLs (optional - currently placeholders)
# Note: As of March 2026, AP2 does not publish JSON-LD schemas.
# These URLs will return 404 but the system handles this gracefully.
# The schema URLs are passed to Truvera API but not validated.
# Update these when official AP2 schemas are published.
AP2_CART_MANDATE_SCHEMA_URL=https://ap2-protocol.org/schemas/cart-mandate/v1
AP2_INTENT_MANDATE_SCHEMA_URL=https://ap2-protocol.org/schemas/intent-mandate/v1
AP2_PAYMENT_MANDATE_SCHEMA_URL=https://ap2-protocol.org/schemas/payment-mandate/v1
```

**Important**: The AP2 protocol specification exists but JSON-LD schemas are not yet published at the URLs above. The system will attempt to fetch them at startup but handles 404 errors gracefully. The schema URLs are passed to Truvera's credential issuance API for future compatibility but are not currently validated. You can configure custom schema URLs when they become available.

**Schema status note**: The local schemas currently bundled in this repository should be treated as interim Truvera-compatible profiles derived from the AP2 documentation, not as definitive upstream AP2 schemas. In particular, the current Payment Mandate schema/context uses camelCase field names such as `paymentMandateContents` and `userAuthorization`, while the AP2 public specification samples currently show snake_case names such as `payment_mandate_contents` and `user_authorization`. When the AP2 community publishes a definitive schema set, this implementation should be reviewed and adjusted to match it.

## Available MCP Tools

### `issue_cart_mandate`
Issue a Cart Mandate for human-present transactions.

**Required Parameters:**
- `mandate_id`: Unique identifier
- `cart_items`: Array of items with label, currency, value
- `total_amount`: Total with currency and value
- `payment_method`: Payment method identifier
- `merchant_id`: Merchant DID or identifier
- `payer_id`: Payer DID or identifier
- `issuer_did`: Credential issuer DID (must exist in Truvera)
- `subject_did`: Credential subject DID

### `issue_intent_mandate`
Issue an Intent Mandate for human-not-present transactions.

**Required Parameters:**
- `mandate_id`: Unique identifier
- `shopping_prompt`: Natural language description
- `budget_max_currency`: Maximum budget currency
- `budget_max_value`: Maximum budget amount
- `payer_id`: Payer DID or identifier
- `issuer_did`: Credential issuer DID
- `subject_did`: Credential subject DID

**Optional Parameters:**
- `ttl_seconds`: Time-to-live (default: 3600)
- `product_categories`: Allowed product categories
- `specific_skus`: Specific SKUs allowed
- `merchant_preference`: Preferred merchant
- `payment_methods`: Authorized payment methods
- `refundable`: Whether purchases must be refundable
- `payee_id`: Optional payee identifier

### `issue_payment_mandate`
Issue a Payment Mandate for network visibility.

Note: This tool currently emits the repository's bundled Payment Mandate profile, which matches the local JSON-LD context and validation schema. That profile may differ in field naming from examples in the current AP2 public spec.

**Required Parameters:**
- `payment_mandate_id`: Unique identifier
- `payment_details_id`: Reference to cart/intent mandate
- `total_currency`: Transaction currency
- `total_value`: Transaction amount
- `payment_method`: Payment method being used
- `human_present`: Boolean indicating modality
- `issuer_did`: Credential issuer DID
- `subject_did`: Credential subject DID

**Optional Parameters:**
- `merchant_agent`: Merchant agent identifier
- `shopping_agent`: Shopping agent identifier
- `refund_period_days`: Refund eligibility period
- `user_authorization`: Optional user authorization signature/token. If omitted, the server currently inserts a placeholder string so the credential matches the published Payment Mandate schema.

## Architecture

### Features
- **Schema Fetching**: JSON-LD schemas are fetched and cached at server startup
- **Dynamic Tool Definitions**: Tool descriptions include schema URLs for LLM context
- **Truvera Integration**: Mandates are issued as Verifiable Credentials via Truvera API
- **Wallet Compatible**: Issued mandates can be stored/presented by wallet-server

### File Structure
```
ap2/
├── types.ts           # TypeScript interfaces for mandates
├── schemas.ts         # JSON schemas for tool definitions
├── schema-fetcher.ts  # Schema fetching and caching logic
├── client.ts          # AP2Client for mandate operations
├── tools.ts           # MCP tool definitions and handlers
├── index.ts           # Module exports
└── tests/
    └── unit/
        ├── ap2-schemas.test.ts
        └── ap2-types.test.ts
```

### Flow

1. **Startup**: Server fetches and caches JSON-LD schemas from configured URLs
2. **Tool Registration**: AP2 tools are registered with dynamic descriptions including schema URLs
3. **Issuance**: When a tool is called, AP2Client constructs the mandate structure and issues it as a VC via Truvera API
4. **Storage**: The issued VC (mandate) can be stored in wallet-server like any other credential

## Testing

Run tests for AP2 functionality:

```bash
# From truvera-api directory
npm run test

# Run only AP2 tests
npm run test -- ap2
```

## Usage Example

```typescript
// Issue a cart mandate for a human-present purchase
const result = await mcpClient.callTool("issue_cart_mandate", {
  mandate_id: "cart_" + Date.now(),
  cart_items: [
    { label: "Product A", currency: "USD", value: 50 },
    { label: "Product B", currency: "USD", value: 30 }
  ],
  total_amount: { currency: "USD", value: 80 },
  payment_method: "CARD",
  merchant_id: "did:example:merchant123",
  payer_id: "did:example:payer456",
  issuer_did: "did:cheqd:testnet:your-issuer-did",
  subject_did: "did:cheqd:testnet:your-subject-did"
});

// The result contains the issued VC which can now be:
// - Stored in wallet-server
// - Presented to merchants
// - Verified by payment networks
```

## Security Considerations

1. **Cryptographic Signing**: Mandates are signed by Truvera's key management system
2. **Schema Validation**: Schemas are fetched once at startup and cached
3. **Expiration**: Intent mandates support TTL for time-bounded authorization
4. **Non-Repudiation**: All mandates are cryptographically verifiable
5. **Privacy**: Sensitive data can be selectively disclosed through VC presentations

## Resources

- [AP2 Protocol Specification](https://ap2-protocol.org/specification/)
- [AP2 Core Concepts](https://ap2-protocol.org/topics/core-concepts/)
- [Truvera API Documentation](https://swagger-api.truvera.io/)
- [W3C Verifiable Credentials](https://www.w3.org/TR/vc-data-model/)
