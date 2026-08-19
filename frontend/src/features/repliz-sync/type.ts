export type typeDataReplizSyncRule = {
  id: string;
  label: string;
  targetUsername: string;
  replizAccountId: string;
  replizAccountLabel: string | null;
  maxItems: number;
  scheduleStartTime: string;
  scheduleIntervalMinutes: number;
  scrapeMode: "posts" | "reels";
  status: "active" | "paused";
  lastRunAt: string | null;
  lastRunStatus: string | null;
  lastRunMessage: string | null;
  createdAt: string;
  updatedAt: string;
};

export type typeDataReplizSyncedPost = {
  id: string;
  ruleId: string;
  shortcode: string;
  postUrl: string | null;
  caption: string | null;
  mediaUrl: string | null;
  isVideo: boolean;
  replizScheduleId: string | null;
  scheduledAt: string | null;
  status: "scheduled" | "failed";
  errorMessage: string | null;
  createdAt: string;
};

export type typeDataRunRuleResult = {
  ruleId: string;
  targetUsername: string;
  scraped: number;
  fresh: number;
  scheduled: number;
  failed: number;
  message: string;
};
