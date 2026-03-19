# AP2 Mandate JSON-LD Schemas

This directory contains JSON-LD context definitions for the three AP2 (Agent Payments Protocol) mandate types.

## Schema Files

### 1. Cart Mandate Schema (`cart-mandate-v1.json`)
Defines the structure for human-present payment authorization where the user sees and approves an exact cart.

**Key Types:**
- `CartMandate` - Top-level mandate structure
- `CartContents` - Detailed cart information signed by merchant
- `PaymentRequest` - W3C Payment Request API structure
- `PaymentItem` - Individual cart items
- `MonetaryAmount` - Currency and value

**Usage in Verifiable Credentials:**
```json
{
  "@context": [
    "https://www.w3.org/2018/credentials/v1",
    "https://your-domain.com/schemas/cart-mandate-v1.json"
  ],
  "type": ["VerifiableCredential", "CartMandate"],
  "credentialSubject": {
    "@type": "CartMandate",
    "contents": { ... },
    "merchantSignature": "...",
    "timestamp": "2026-03-04T12:00:00Z"
  }
}
```

### 2. Intent Mandate Schema (`intent-mandate-v1.json`)
Defines the structure for human-not-present authorization where an agent acts within constraints.

**Key Types:**
- `IntentMandate` - Top-level mandate structure
- `IntentMandateContents` - Authorization details and constraints
- `ShoppingIntent` - Natural language intent with budget/product constraints
- `MonetaryAmount` - Budget limits

**Usage in Verifiable Credentials:**
```json
{
  "@context": [
    "https://www.w3.org/2018/credentials/v1",
    "https://your-domain.com/schemas/intent-mandate-v1.json"
  ],
  "type": ["VerifiableCredential", "IntentMandate"],
  "credentialSubject": {
    "@type": "IntentMandate",
    "contents": {
      "id": "intent_123",
      "shoppingIntent": {
        "prompt": "Buy concert tickets when available, budget $1000",
        "budgetMax": { "currency": "USD", "value": 1000 }
      },
      "ttl": 86400
    },
    "timestamp": "2026-03-04T12:00:00Z"
  }
}
```

### 3. Payment Mandate Schema (`payment-mandate-v1.json`)
Defines the structure for payment network visibility showing AI agent involvement.

**Key Types:**
- `PaymentMandate` - Top-level mandate structure
- `PaymentMandateContents` - Payment details and agent information
- `PaymentResponse` - Selected payment method details
- `TransactionModality` - Human present/not present indicator

**Usage in Verifiable Credentials:**
```json
{
  "@context": [
    "https://www.w3.org/2018/credentials/v1",
    "https://your-domain.com/schemas/payment-mandate-v1.json"
  ],
  "type": ["VerifiableCredential", "PaymentMandate"],
  "credentialSubject": {
    "@type": "PaymentMandate",
    "paymentMandateContents": {
      "paymentMandateId": "pm_123",
      "humanPresent": true,
      "merchantAgent": "MerchantAgent",
      "shoppingAgent": "ShoppingAgent"
    },
    "userAuthorization": "eyJhbGci..."
  }
}
```

Note: This example reflects the local bundled Payment Mandate profile used by the MCP server today. The public AP2 specification currently shows Payment Mandate examples in snake_case, while this local profile uses camelCase so it stays consistent with the bundled JSON-LD context and validation schema. Treat this as an interim profile pending definitive upstream AP2 schemas.

## Schema Design Principles

### 1. W3C Compatibility
All schemas are designed to work as JSON-LD contexts within W3C Verifiable Credentials:
- Compatible with `https://www.w3.org/2018/credentials/v1`
- Follow JSON-LD 1.1 specification
- Use `@protected: true` to prevent context override attacks

### 2. Namespace Design
- `ap2:` - AP2 protocol-specific terms
- `schema:` - Schema.org terms for common concepts (price, currency, email)
- `xsd:` - XML Schema datatypes for strong typing

### 3. Type Safety
- Strong typing with `@type` declarations
- Explicit datatype mappings (`xsd:string`, `xsd:boolean`, `xsd:dateTime`)
- Structured types for complex objects (`@type: "@id"`)

### 4. Based on AP2 Specification
These schemas implement:
- [AP2 Protocol Specification](https://ap2-protocol.org/specification/)
- Python Pydantic models from the [official repository](https://github.com/google-agentic-commerce/AP2)
- W3C Payment Request API structure

## Publishing Instructions

To publish these schemas:

1. **Host on a permanent URL** (e.g., GitHub Pages, CDN, your domain):
   ```
   https://your-domain.com/schemas/ap2/v1/cart-mandate.json
   https://your-domain.com/schemas/ap2/v1/intent-mandate.json
   https://your-domain.com/schemas/ap2/v1/payment-mandate.json
   ```

2. **Update environment variables** in `.env`:
   ```bash
   AP2_CART_MANDATE_SCHEMA_URL=https://your-domain.com/schemas/ap2/v1/cart-mandate.json
   AP2_INTENT_MANDATE_SCHEMA_URL=https://your-domain.com/schemas/ap2/v1/intent-mandate.json
   AP2_PAYMENT_MANDATE_SCHEMA_URL=https://your-domain.com/schemas/ap2/v1/payment-mandate.json
   ```

3. **Ensure CORS headers** if hosting on a different domain:
   ```
   Access-Control-Allow-Origin: *
   Access-Control-Allow-Methods: GET, OPTIONS
   Content-Type: application/ld+json
   ```

4. **Restart the MCP server** to fetch and cache the schemas

## Validation

These schemas can be validated using:
- [JSON-LD Playground](https://json-ld.org/playground/)
- [W3C JSON-LD Validator](https://www.w3.org/2015/03/json-ld-validator/)

## Versioning

- Current version: `v1`
- Schema URL format: `{base_url}/ap2/v1/{mandate-type}.json`
- Breaking changes require new version (v2, v3, etc.)
- Non-breaking additions can be made to v1

## References

- **AP2 Specification**: https://ap2-protocol.org/specification/
- **AP2 Repository**: https://github.com/google-agentic-commerce/AP2
- **W3C Verifiable Credentials**: https://www.w3.org/TR/vc-data-model/
- **JSON-LD 1.1**: https://www.w3.org/TR/json-ld11/
- **W3C Payment Request API**: https://www.w3.org/TR/payment-request/
- **Schema.org**: https://schema.org/

## License

These schemas are designed to be compatible with the Apache 2.0 licensed AP2 protocol.
