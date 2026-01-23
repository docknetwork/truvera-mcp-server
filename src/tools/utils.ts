import type { ApiResponse } from "../clients/truvera.js";
import type { ToolResult } from "./types.js";

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

export function liftProperties<T extends Record<string, any>>(obj: T): Omit<T, keyof T> & (T[keyof T] extends Record<string, any> ? T[keyof T] : Record<string, never>) {
    // Check if the input object has exactly one key and if the value is an object
    const keys = Object.keys(obj);
    if (keys.length !== 1 || typeof obj[keys[0]] !== 'object' || obj[keys[0]] === null || Array.isArray(obj[keys[0]])) {
        console.error("Input object must contain exactly one non-null, non-array object property.");
        return { ...obj } as any; // Return original object or handle error as needed
    }

    const nestedKey = keys[0];
    const nestedObject = obj[nestedKey];

    const liftedObject = { ...nestedObject} as any;
    const liftedKeys = Object.keys(liftedObject);
    if (liftedKeys.length === 1 && (liftedKeys[0] === 'payload' || liftedKeys[0] === 'body' )) {
      console.log("Further lifting nested 'payload' or 'body' property");
      return liftProperties(liftedObject) as any;
    }

    // Use object spread to merge the properties
    return liftedObject as any; // Type assertion needed here due to the dynamic nature
}
