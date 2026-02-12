export interface ApiError {
  error: string;
  message: string;
  statusCode: number;
  details?: unknown;
}
