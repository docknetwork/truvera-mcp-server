# AP2 JSON Schemas

This directory contains both **JSON-LD context files** and **JSON Schema validation files** for the three AP2 mandate types.

## File Types

### JSON-LD Context Files (Semantic)
Used within W3C Verifiable Credentials to provide semantic meaning:
- `cart-mandate-v1.json` - JSON-LD context for Cart Mandates
- `intent-mandate-v1.json` - JSON-LD context for Intent Mandates  
- `payment-mandate-v1.json` - JSON-LD context for Payment Mandates

### JSON Schema Files (Validation)
Used to validate the structure of mandate data:
- `cart-mandate-schema.json` - Validation schema for Cart Mandates
- `intent-mandate-schema.json` - Validation schema for Intent Mandates
- `payment-mandate-schema.json` - Validation schema for Payment Mandates

## Usage

### In Verifiable Credentials (JSON-LD)

When issuing a mandate as a Verifiable Credential:

```json
{
  "@context": [
    "https://www.w3.org/2018/credentials/v1",
    "https://your-domain.com/schemas/ap2/v1/cart-mandate-v1.json"
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

### For Validation (JSON Schema)

Before issuing or after receiving a mandate, validate its structure:

```typescript
import Ajv from 'ajv';
import cartMandateSchema from './schemas/cart-mandate-schema.json';

const ajv = new Ajv();
const validate = ajv.compile(cartMandateSchema);

const isValid = validate(mandateData);
if (!isValid) {
  console.error('Validation errors:', validate.errors);
}
```

## Schema Comparison

| Aspect | JSON-LD Context | JSON Schema |
|--------|----------------|-------------|
| **Purpose** | Semantic meaning & linked data | Structure validation |
| **Used For** | Verifiable Credentials | Data validation |
| **Validates** | ❌ No | ✅ Yes |
| **Provides Semantics** | ✅ Yes | ❌ No |
| **File Extension** | `.json` | `-schema.json` |
| **Specification** | [JSON-LD 1.1](https://www.w3.org/TR/json-ld11/) | [JSON Schema 2020-12](https://json-schema.org/draft/2020-12/schema) |

## Cart Mandate

**Human-present transactions** where user sees and approves exact cart.

**Validation Schema**: `cart-mandate-schema.json`
- Required: `contents`, `merchantSignature`, `timestamp`
- Contains: `CartContents`, `PaymentRequest` (W3C Payment Request API)
- Features: Line items, totals, payment methods, shipping options

**JSON-LD Context**: `cart-mandate-v1.json`
- Maps fields to semantic URIs
- Uses `ap2:`, `schema:`, `xsd:` namespaces

## Intent Mandate

**Human-not-present authorization** where agent acts within constraints.

**Validation Schema**: `intent-mandate-schema.json`
- Required: `contents`, `userSignature`, `timestamp`, `ttl`
- Contains: `IntentMandateContents`, `ShoppingIntent`
- Features: Natural language prompt, budget constraints, product categories, TTL

**JSON-LD Context**: `intent-mandate-v1.json`
- Maps fields to semantic URIs
- Supports budget limits, merchant preferences, refundability

## Payment Mandate

**Payment network visibility** showing AI agent involvement.

Note: The Payment Mandate schema and JSON-LD context in this directory are currently an interim Truvera-compatible profile. They are internally consistent, but they may differ from examples shown in the public AP2 specification until the AP2 project publishes a definitive schema set.

**Validation Schema**: `payment-mandate-schema.json`
- Required: `paymentMandateContents`, `userAuthorization`
- Contains: `PaymentMandateContents`, `PaymentResponse`
- Features: Agent identifiers, human presence flag, payment details

Field naming note:
- Local schema/context: camelCase fields such as `paymentMandateContents`, `paymentMandateId`, `paymentResponse`, `humanPresent`, `userAuthorization`
- Current AP2 public examples: snake_case fields such as `payment_mandate_contents`, `payment_mandate_id`, `payment_response`, `human_present`, `user_authorization`

**JSON-LD Context**: `payment-mandate-v1.json`
- Maps payment details and agent info
- Supports transaction modality (human present/not present)

## Publishing Both Types

When publishing, host both file types:

```
https://your-domain.com/schemas/ap2/v1/
├── cart-mandate-v1.json         (JSON-LD context)
├── cart-mandate-schema.json     (JSON Schema)
├── intent-mandate-v1.json       (JSON-LD context)
├── intent-mandate-schema.json   (JSON Schema)
├── payment-mandate-v1.json      (JSON-LD context)
└── payment-mandate-schema.json  (JSON Schema)
```

## Validation Tools

### JSON Schema Validators
- **AJV**: https://ajv.js.org/ (JavaScript/Node.js)
- **jsonschema**: https://python-jsonschema.readthedocs.io/ (Python)
- Online: https://www.jsonschemavalidator.net/

### JSON-LD Validators
- W3C Validator: https://www.w3.org/2015/03/json-ld-validator/
- JSON-LD Playground: https://json-ld.org/playground/

## Environment Variables

Update your `.env` to reference both schemas and contexts:

```bash
# JSON-LD Contexts (for Verifiable Credentials)
AP2_CART_MANDATE_SCHEMA_URL=https://your-domain.com/schemas/ap2/v1/cart-mandate-v1.json
AP2_INTENT_MANDATE_SCHEMA_URL=https://your-domain.com/schemas/ap2/v1/intent-mandate-v1.json
AP2_PAYMENT_MANDATE_SCHEMA_URL=https://your-domain.com/schemas/ap2/v1/payment-mandate-v1.json

# JSON Schemas (for validation - optional, can be bundled)
AP2_CART_MANDATE_VALIDATION_SCHEMA=https://your-domain.com/schemas/ap2/v1/cart-mandate-schema.json
AP2_INTENT_MANDATE_VALIDATION_SCHEMA=https://your-domain.com/schemas/ap2/v1/intent-mandate-schema.json
AP2_PAYMENT_MANDATE_VALIDATION_SCHEMA=https://your-domain.com/schemas/ap2/v1/payment-mandate-schema.json
```

## Implementation Notes

1. **Use JSON-LD contexts** in the `@context` array of Verifiable Credentials
2. **Use JSON Schemas** to validate mandate data before/after issuance
3. **Both are important**: Semantics for interoperability, validation for correctness
4. **Version independently**: You can update validation rules without changing semantics

## Examples

See `README.md` for complete usage examples of both types in the AP2 workflow.

## References

- **JSON-LD 1.1**: https://www.w3.org/TR/json-ld11/
- **JSON Schema 2020-12**: https://json-schema.org/draft/2020-12/schema
- **W3C Verifiable Credentials**: https://www.w3.org/TR/vc-data-model/
- **AP2 Protocol**: https://ap2-protocol.org/specification/
