/**
 * POST /webhooks
 */
export interface CreateWebhookRequest {
  url: string;
  events: string[];

  /**
   * @default true
   */
  active?: boolean;
}

export interface Webhook {
  id: string;
  url: string;
  events: string[];
  active: boolean;
  createdAt: string;
}
