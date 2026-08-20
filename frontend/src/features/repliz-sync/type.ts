export type typeDataReplizSyncRule = {
  id: string;
  label: string;
  targetUsernames: string[];
  replizAccountId: string;
  replizAccountLabel: string | null;
  maxItems: number;
  scrapeTime: string;
  scheduleStartTime: string;
  scheduleIntervalMinutes: number;
  sourcePlatform: "instagram" | "facebook";
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
  targetUsername: string;
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

export type typeDataRunTargetResult = {
  targetUsername: string;
  scraped: number;
  fresh: number;
  scheduled: number;
  failed: number;
  error?: string;
};

export type typeDataRunRuleResult = {
  ruleId: string;
  targets: typeDataRunTargetResult[];
  scraped: number;
  fresh: number;
  scheduled: number;
  failed: number;
  message: string;
};
