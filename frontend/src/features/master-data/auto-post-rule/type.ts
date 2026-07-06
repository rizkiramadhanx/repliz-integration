export type typeAutoPostTarget =
  | "facebook"
  | "instagram"
  | "telegram"
  | "twitter";

export type typeAutoPostMediaType = "image" | "video" | "text";

export type typeFacebookPostMode = "wall" | "group";

export type typeCaptionReplacement = {
  find: string;
  replace: string;
};

export type typeDataAutoPostRule = {
  id: string;
  name: string;
  discord_account_id: string;
  discord_channel_ids: string[];
  targets: typeAutoPostTarget[];
  facebook_account_id: string | null;
  facebook_post_mode: typeFacebookPostMode | null;
  facebook_group_ids: string[] | null;
  instagram_account_id: string | null;
  twitter_account_id: string | null;
  telegram_account_id: string | null;
  telegram_chat_ids: string[] | null;
  media_types: typeAutoPostMediaType[];
  caption_prefix: string | null;
  caption_suffix: string | null;
  caption_replacements: typeCaptionReplacement[] | null;
  save_mode: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type typeDataCreateAutoPostRulePayload = {
  name: string;
  discordAccountId: string;
  discordChannelIds: string[];
  targets: typeAutoPostTarget[];
  facebookAccountId?: string;
  facebookPostMode?: typeFacebookPostMode;
  facebookGroupIds?: string[];
  instagramAccountId?: string;
  twitterAccountId?: string;
  telegramAccountId?: string;
  telegramChatIds?: string[];
  mediaTypes: typeAutoPostMediaType[];
  captionPrefix?: string;
  captionSuffix?: string;
  captionReplacements?: typeCaptionReplacement[];
  saveMode?: boolean;
  isActive?: boolean;
};

export type typeDataUpdateAutoPostRulePayload =
  Partial<typeDataCreateAutoPostRulePayload>;
