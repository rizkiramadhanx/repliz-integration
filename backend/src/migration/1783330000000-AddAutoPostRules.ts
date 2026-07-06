import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAutoPostRules1783330000000 implements MigrationInterface {
  name = 'AddAutoPostRules1783330000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "auto_post_rules" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying(255) NOT NULL, "discord_account_id" uuid NOT NULL, "discord_channel_ids" jsonb NOT NULL, "targets" jsonb NOT NULL, "facebook_account_id" uuid, "facebook_post_mode" character varying, "facebook_group_ids" jsonb, "instagram_account_id" uuid, "twitter_account_id" uuid, "telegram_account_id" uuid, "telegram_chat_ids" jsonb, "media_types" jsonb NOT NULL, "caption_prefix" text, "caption_suffix" text, "caption_replacements" jsonb, "save_mode" boolean NOT NULL DEFAULT false, "is_active" boolean NOT NULL DEFAULT true, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_auto_post_rules_id" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `ALTER TABLE "auto_post_rules" ADD CONSTRAINT "FK_auto_post_rules_discord_account" FOREIGN KEY ("discord_account_id") REFERENCES "accounts"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "auto_post_rules" ADD CONSTRAINT "FK_auto_post_rules_facebook_account" FOREIGN KEY ("facebook_account_id") REFERENCES "accounts"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "auto_post_rules" ADD CONSTRAINT "FK_auto_post_rules_instagram_account" FOREIGN KEY ("instagram_account_id") REFERENCES "accounts"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "auto_post_rules" ADD CONSTRAINT "FK_auto_post_rules_twitter_account" FOREIGN KEY ("twitter_account_id") REFERENCES "accounts"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "auto_post_rules" ADD CONSTRAINT "FK_auto_post_rules_telegram_account" FOREIGN KEY ("telegram_account_id") REFERENCES "accounts"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "auto_post_rules" DROP CONSTRAINT "FK_auto_post_rules_telegram_account"`,
    );
    await queryRunner.query(
      `ALTER TABLE "auto_post_rules" DROP CONSTRAINT "FK_auto_post_rules_twitter_account"`,
    );
    await queryRunner.query(
      `ALTER TABLE "auto_post_rules" DROP CONSTRAINT "FK_auto_post_rules_instagram_account"`,
    );
    await queryRunner.query(
      `ALTER TABLE "auto_post_rules" DROP CONSTRAINT "FK_auto_post_rules_facebook_account"`,
    );
    await queryRunner.query(
      `ALTER TABLE "auto_post_rules" DROP CONSTRAINT "FK_auto_post_rules_discord_account"`,
    );
    await queryRunner.query(`DROP TABLE "auto_post_rules"`);
  }
}
