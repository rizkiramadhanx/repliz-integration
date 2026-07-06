import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Expose } from 'class-transformer';

export const AUTO_POST_TARGETS = [
  'facebook',
  'instagram',
  'telegram',
  'twitter',
] as const;
export type AutoPostTarget = (typeof AUTO_POST_TARGETS)[number];

export const AUTO_POST_MEDIA_TYPES = ['image', 'video', 'text'] as const;
export type AutoPostMediaType = (typeof AUTO_POST_MEDIA_TYPES)[number];

export const FACEBOOK_POST_MODES = ['wall', 'group'] as const;
export type FacebookPostMode = (typeof FACEBOOK_POST_MODES)[number];

export type CaptionReplacement = {
  find: string;
  replace: string;
};

@Entity('auto_post_rules')
export class AutoPostRuleEntity {
  @PrimaryGeneratedColumn('uuid')
  @Expose({ name: 'id' })
  id: string;

  @Column({ length: 255 })
  @Expose({ name: 'name' })
  name: string;

  @Column({ name: 'discord_account_id', type: 'uuid' })
  @Expose({ name: 'discord_account_id' })
  discordAccountId: string;

  @Column({ name: 'discord_channel_ids', type: 'jsonb' })
  @Expose({ name: 'discord_channel_ids' })
  discordChannelIds: string[];

  @Column({ type: 'jsonb' })
  @Expose({ name: 'targets' })
  targets: AutoPostTarget[];

  @Column({ name: 'facebook_account_id', type: 'uuid', nullable: true })
  @Expose({ name: 'facebook_account_id' })
  facebookAccountId: string | null;

  @Column({ name: 'facebook_post_mode', type: 'varchar', nullable: true })
  @Expose({ name: 'facebook_post_mode' })
  facebookPostMode: FacebookPostMode | null;

  @Column({ name: 'facebook_group_ids', type: 'jsonb', nullable: true })
  @Expose({ name: 'facebook_group_ids' })
  facebookGroupIds: string[] | null;

  @Column({ name: 'instagram_account_id', type: 'uuid', nullable: true })
  @Expose({ name: 'instagram_account_id' })
  instagramAccountId: string | null;

  @Column({ name: 'twitter_account_id', type: 'uuid', nullable: true })
  @Expose({ name: 'twitter_account_id' })
  twitterAccountId: string | null;

  @Column({ name: 'telegram_account_id', type: 'uuid', nullable: true })
  @Expose({ name: 'telegram_account_id' })
  telegramAccountId: string | null;

  @Column({ name: 'telegram_chat_ids', type: 'jsonb', nullable: true })
  @Expose({ name: 'telegram_chat_ids' })
  telegramChatIds: string[] | null;

  @Column({ name: 'media_types', type: 'jsonb' })
  @Expose({ name: 'media_types' })
  mediaTypes: AutoPostMediaType[];

  @Column({ name: 'caption_prefix', type: 'text', nullable: true })
  @Expose({ name: 'caption_prefix' })
  captionPrefix: string | null;

  @Column({ name: 'caption_suffix', type: 'text', nullable: true })
  @Expose({ name: 'caption_suffix' })
  captionSuffix: string | null;

  @Column({ name: 'caption_replacements', type: 'jsonb', nullable: true })
  @Expose({ name: 'caption_replacements' })
  captionReplacements: CaptionReplacement[] | null;

  @Column({ name: 'save_mode', default: false })
  @Expose({ name: 'save_mode' })
  saveMode: boolean;

  @Column({ name: 'is_active', default: true })
  @Expose({ name: 'is_active' })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  @Expose({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  @Expose({ name: 'updated_at' })
  updatedAt: Date;
}
