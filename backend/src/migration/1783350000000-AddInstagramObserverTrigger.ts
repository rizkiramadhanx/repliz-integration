import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddInstagramObserverTrigger1783350000000
  implements MigrationInterface
{
  name = 'AddInstagramObserverTrigger1783350000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "auto_post_rules" ADD "trigger_type" character varying NOT NULL DEFAULT 'discord_observer'`,
    );
    await queryRunner.query(
      `ALTER TABLE "auto_post_rules" ALTER COLUMN "discord_account_id" DROP NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "auto_post_rules" ALTER COLUMN "discord_channel_ids" DROP NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "auto_post_rules" ADD "instagram_observer_account_id" uuid`,
    );
    await queryRunner.query(
      `ALTER TABLE "auto_post_rules" ADD "instagram_target_usernames" jsonb`,
    );
    await queryRunner.query(
      `ALTER TABLE "auto_post_rules" ADD "exclude_keywords" jsonb`,
    );
    await queryRunner.query(
      `ALTER TABLE "auto_post_rules" ADD "include_original_caption" boolean NOT NULL DEFAULT true`,
    );
    await queryRunner.query(
      `ALTER TABLE "auto_post_rules" ADD "instagram_check_interval_minutes" integer`,
    );
    await queryRunner.query(
      `ALTER TABLE "auto_post_rules" ADD CONSTRAINT "FK_auto_post_rules_instagram_observer_account" FOREIGN KEY ("instagram_observer_account_id") REFERENCES "accounts"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );

    await queryRunner.query(
      `CREATE TABLE "processed_instagram_posts" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "rule_id" uuid NOT NULL, "source_item_id" character varying NOT NULL, "processed_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "UQ_processed_instagram_posts_rule_source" UNIQUE ("rule_id", "source_item_id"), CONSTRAINT "PK_processed_instagram_posts_id" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `ALTER TABLE "processed_instagram_posts" ADD CONSTRAINT "FK_processed_instagram_posts_rule" FOREIGN KEY ("rule_id") REFERENCES "auto_post_rules"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "processed_instagram_posts" DROP CONSTRAINT "FK_processed_instagram_posts_rule"`,
    );
    await queryRunner.query(`DROP TABLE "processed_instagram_posts"`);

    await queryRunner.query(
      `ALTER TABLE "auto_post_rules" DROP CONSTRAINT "FK_auto_post_rules_instagram_observer_account"`,
    );
    await queryRunner.query(
      `ALTER TABLE "auto_post_rules" DROP COLUMN "instagram_check_interval_minutes"`,
    );
    await queryRunner.query(
      `ALTER TABLE "auto_post_rules" DROP COLUMN "include_original_caption"`,
    );
    await queryRunner.query(
      `ALTER TABLE "auto_post_rules" DROP COLUMN "exclude_keywords"`,
    );
    await queryRunner.query(
      `ALTER TABLE "auto_post_rules" DROP COLUMN "instagram_target_usernames"`,
    );
    await queryRunner.query(
      `ALTER TABLE "auto_post_rules" DROP COLUMN "instagram_observer_account_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "auto_post_rules" ALTER COLUMN "discord_channel_ids" SET NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "auto_post_rules" ALTER COLUMN "discord_account_id" SET NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "auto_post_rules" DROP COLUMN "trigger_type"`,
    );
  }
}
