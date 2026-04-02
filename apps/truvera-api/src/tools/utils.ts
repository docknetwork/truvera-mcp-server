import type { ApiResponse } from "../clients/truvera.js";
import type { ToolResult } from "@truvera/mcp-shared/tools";

export function formatResult(result: ApiResponse): ToolResult {
  if (!result.success) {
    return {
      content: [{ type: "text", text: result.error || "Unknown error" }],
      isError: true,
    };
  }

  return {
    content: [{ type: "text", text: JSON.stringify(result.data, null, 2) }],
  };
}

export function liftProperties<T extends Record<string, unknown>>(obj: T): Omit<T, keyof T> & (T[keyof T] extends Record<string, unknown> ? T[keyof T] : Record<string, never>) {
    // Check if the input object has exactly one key and if the value is an object
    const keys = Object.keys(obj);
    if (keys.length !== 1 || typeof obj[keys[0]] !== 'object' || obj[keys[0]] === null || Array.isArray(obj[keys[0]])) {
        console.error("Input object must contain exactly one non-null, non-array object property.");
        return { ...obj } as ReturnType<typeof liftProperties<T>>;
    }

    const nestedKey = keys[0];
    const nestedObject = obj[nestedKey] as Record<string, unknown>;

    const liftedObject = { ...nestedObject};
    const liftedKeys = Object.keys(liftedObject);
    if (liftedKeys.length === 1 && (liftedKeys[0] === 'payload' || liftedKeys[0] === 'body' )) {
      console.log("Further lifting nested 'payload' or 'body' property");
      return liftProperties(liftedObject) as ReturnType<typeof liftProperties<T>>;
    }

    // Use object spread to merge the properties
    return liftedObject as ReturnType<typeof liftProperties<T>>;
}

function extractIdFromSubject(subject: unknown): string | undefined {
  if (Array.isArray(subject)) {
    for (const item of subject) {
      if (item && typeof item === "object" && typeof (item as { id?: unknown }).id === "string") {
        return (item as { id: string }).id;
      }
    }
    return undefined;
  }

  if (subject && typeof subject === "object" && typeof (subject as { id?: unknown }).id === "string") {
    return (subject as { id: string }).id;
  }

  return undefined;
}

export function isDid(value: unknown): value is string {
  return typeof value === "string" && value.trim().startsWith("did:");
}

export function getSubjectIdFromCredential(credential: unknown): string | undefined {
  if (!credential || typeof credential !== "object") {
    return undefined;
  }

  const asRecord = credential as Record<string, unknown>;
  const fromTruveraShape = extractIdFromSubject(asRecord.subject);
  if (fromTruveraShape) {
    return fromTruveraShape;
  }

  return extractIdFromSubject(asRecord.credentialSubject);
}
