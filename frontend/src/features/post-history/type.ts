export type typePostHistoryPlatform =
  | "facebook"
  | "instagram"
  | "telegram"
  | "twitter";

export type typePostHistoryMediaType = "text" | "photo" | "video";

export type typePostHistoryTriggerSource =
  | "discord_observer"
  | "discord_run_now";

export type typePostHistoryStatus = "pending" | "success" | "failed";

export type typeDataPostHistory = {
  id: string;
  rule_id: string | null;
  rule_name: string | null;
  target_account_id: string | null;
  target_account: { label: string; type: string } | null;
  platform: typePostHistoryPlatform;
  target_ref: string | null;
  media_type: typePostHistoryMediaType;
  trigger_source: typePostHistoryTriggerSource;
  source_label: string | null;
  source_url: string | null;
  caption: string | null;
  post_url: string | null;
  status: typePostHistoryStatus;
  attempts: number;
  error_message: string | null;
  posted_at: string;
  updated_at: string;
};

export type typeDataPostHistoryMeta = {
  page: number;
  limit: number;
  total: number;
  total_page: number;
};

export type typeDataPostHistoryListResponse = {
  status: string;
  code: number;
  message: string;
  data: typeDataPostHistory[];
  meta: typeDataPostHistoryMeta;
};
