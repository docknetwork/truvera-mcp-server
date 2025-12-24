/**
 * GET /jobs
 */
export interface ListJobsQuery {
  status?: 'pending' | 'running' | 'completed' | 'failed';
  limit?: number;
  offset?: number;
}

export interface Job {
  id: string;
  type: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  createdAt: string;
  updatedAt?: string;
  result?: unknown;
}
