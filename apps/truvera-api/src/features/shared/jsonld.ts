export type JsonLdContext =
  | string
  | Record<string, unknown>
  | Array<string | Record<string, unknown>>;
