import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddScheduledPosts1783390000000 implements MigrationInterface {
  name = 'AddScheduledPosts1783390000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "scheduled_posts" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "source_account_id" uuid, "source_url" text, "caption" text NOT NULL DEFAULT '', "media_path" text, "thumbnail_url" text, "is_video" boolean NOT NULL DEFAULT false, "target_account_ids" jsonb NOT NULL DEFAULT '[]', "scheduled_at" TIMESTAMP WITH TIME ZONE, "status" character varying NOT NULL DEFAULT 'draft', "job_id" text, "error_message" text, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_scheduled_posts_id" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `ALTER TABLE "scheduled_posts" ADD CONSTRAINT "FK_scheduled_posts_source_account" FOREIGN KEY ("source_account_id") REFERENCES "accounts"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "scheduled_posts" DROP CONSTRAINT "FK_scheduled_posts_source_account"`,
    );
    await queryRunner.query(`DROP TABLE "scheduled_posts"`);
  }
}
