/**
 * POST /schemas
 * Create a schema
 */
export interface CreateSchemaRequest {
  $schema?: string;
  name?: string;
  description?: string;
  type?: string;
  properties?: Record<string, unknown>;
  required?: string[];
  additionalProperties?: boolean;
}
