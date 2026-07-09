/**
 * Message feature types
 */

export interface ProcessedMessage {
  id?: string;
  type?: string;
  from?: string;
  to?: string;
  body?: Record<string, unknown>;
  /**
   * Hint for which wallet-server tool to call next:
   * - 'respond_to_proof_request' when type is RequestPresentation
   * - 'import_credential' when type is IssueWithData and body contains an offer URI
   */
  suggestedAction?: string;
}

export interface FetchMessagesResult {
  success: boolean;
  messages: ProcessedMessage[];
  decryptedCount: number;
  processedCount: number;
  message?: string;
}

export interface SendMessageParams {
  to: string;
  message: Record<string, unknown>;
  type?: string;
  from?: string;
}

export interface SendMessageResult {
  success: boolean;
  message?: string;
}
