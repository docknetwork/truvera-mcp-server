/**
 * AP2 Schema Fetcher
 * Fetches and caches JSON-LD schemas at startup
 */

import type { SchemaCache } from "./types.js";

/**
 * Schema cache storage
 */
const schemaCache = new Map<string, SchemaCache>();

/**
 * Fetch a JSON-LD schema from URL and cache it
 * Returns null if schema cannot be fetched (e.g., 404, network error)
 */
export async function fetchSchema(url: string): Promise<unknown | null> {
  console.error(`[AP2] Fetching schema from: ${url}`);
  
  try {
    const response = await fetch(url);
    
    if (!response.ok) {
      console.error(`[AP2] Schema not available at ${url} (${response.status}). This is expected - AP2 JSON-LD schemas are not yet published.`);
      return null;
    }
    
    const schema = await response.json();
    
    // Cache the schema
    schemaCache.set(url, {
      schema,
      fetchedAt: new Date(),
      url,
    });
    
    console.error(`[AP2] Successfully fetched and cached schema: ${url}`);
    return schema;
  } catch (error) {
    console.error(`[AP2] Could not fetch schema from ${url}:`, error instanceof Error ? error.message : String(error));
    return null;
  }
}

/**
 * Get cached schema
 */
export function getCachedSchema(url: string): unknown | undefined {
  return schemaCache.get(url)?.schema;
}

/**
 * Check if schema is cached
 */
export function hasSchema(url: string): boolean {
  return schemaCache.has(url);
}

/**
 * Get all cached schemas
 */
export function getAllCachedSchemas(): Map<string, SchemaCache> {
  return new Map(schemaCache);
}

/**
 * Clear schema cache (useful for testing)
 */
export function clearSchemaCache(): void {
  schemaCache.clear();
}

/**
 * Initialize AP2 schemas from environment variables
 * Note: As of March 2026, AP2 does not publish JSON-LD schemas.
 * Schema URLs can be configured when they become available.
 */
export async function initializeAP2Schemas(): Promise<{
  cartMandateSchema: unknown | null;
  intentMandateSchema: unknown | null;
  paymentMandateSchema: unknown | null;
}> {
  // Placeholder URLs - AP2 has not published JSON-LD schemas yet
  // See: https://github.com/google-agentic-commerce/AP2
  const cartUrl = process.env.AP2_CART_MANDATE_SCHEMA_URL || "https://schema.truvera.io/CartMandateHumanPresent-V1-1772663227477.json";
  const intentUrl = process.env.AP2_INTENT_MANDATE_SCHEMA_URL || "https://schema.truvera.io/IntentMandateHumanNotPresent-V1-1772663293733.json";
  const paymentUrl = process.env.AP2_PAYMENT_MANDATE_SCHEMA_URL || "https://schema.truvera.io/PaymentMandate-V1-1772663322422.json";
  
  console.error("[AP2] Initializing schemas...");
  console.error(`  - Cart Mandate: ${cartUrl}`);
  console.error(`  - Intent Mandate: ${intentUrl}`);
  console.error(`  - Payment Mandate: ${paymentUrl}`);
  console.error(`  - Note: AP2 JSON-LD schemas are not yet published. URLs are placeholders.`);
  
  // Fetch all schemas in parallel (will return null if not available)
  const [cartMandateSchema, intentMandateSchema, paymentMandateSchema] = await Promise.all([
    fetchSchema(cartUrl),
    fetchSchema(intentUrl),
    fetchSchema(paymentUrl),
  ]);
  
  const availableCount = [cartMandateSchema, intentMandateSchema, paymentMandateSchema].filter(s => s !== null).length;
  console.error(`[AP2] Schema initialization complete (${availableCount}/3 schemas available)`);
  
  return {
    cartMandateSchema,
    intentMandateSchema,
    paymentMandateSchema,
  };
}
