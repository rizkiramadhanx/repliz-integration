export type typeScheduledPostStatus =
  | "draft"
  | "scheduled"
  | "publishing"
  | "success"
  | "failed"
  | "cancelled";

export type typeDataScheduledPost = {
  id: string;
  source_account_id: string | null;
  source_url: string | null;
  caption: string;
  media_path: string | null;
  thumbnail_url: string | null;
  is_video: boolean;
  target_account_ids: string[];
  scheduled_at: string | null;
  status: typeScheduledPostStatus;
  job_id: string | null;
  error_message: string | null;
  created_at: string;
  updated_at: string;
};

export type typeDataGetAllScheduledPostsParams = {
  page?: number;
  limit?: number;
  startDate?: string;
  endDate?: string;
};

export type typeBulkActionResult = {
  succeeded: string[];
  failed: { id: string; message: string }[];
};

export type typeScrapeBatchStatus = "running" | "stopped" | "completed" | "failed";

export type typeDataScrapeBatchJob = {
  id: string;
  source_account_id: string;
  target_username: string;
  batch_size: number;
  total_limit: number;
  fetched_count: number;
  status: typeScrapeBatchStatus;
  error_message: string | null;
  created_at: string;
  updated_at: string;
};

export type typeScrapedPostStatus = "pending" | "used";

export type typeDataScrapedPost = {
  id: string;
  batch_job_id: string;
  shortcode: string;
  post_url: string;
  caption: string;
  thumbnail_url: string | null;
  is_video: boolean;
  status: typeScrapedPostStatus;
  created_at: string;
};

export type typeBatchProgressPayload = {
  batchJobId: string;
  fetchedCount: number;
  totalLimit: number;
  status: typeScrapeBatchStatus;
  errorMessage?: string;
};
