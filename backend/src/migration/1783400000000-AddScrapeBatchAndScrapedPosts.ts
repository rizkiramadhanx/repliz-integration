import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddScrapeBatchAndScrapedPosts1783400000000
  implements MigrationInterface
{
  name = 'AddScrapeBatchAndScrapedPosts1783400000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "scrape_batch_jobs" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "source_account_id" uuid NOT NULL, "target_username" character varying(255) NOT NULL, "batch_size" integer NOT NULL DEFAULT 10, "total_limit" integer NOT NULL, "fetched_count" integer NOT NULL DEFAULT 0, "status" character varying NOT NULL DEFAULT 'running', "error_message" text, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_scrape_batch_jobs_id" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `ALTER TABLE "scrape_batch_jobs" ADD CONSTRAINT "FK_scrape_batch_jobs_source_account" FOREIGN KEY ("source_account_id") REFERENCES "accounts"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );

    await queryRunner.query(
      `CREATE TABLE "scraped_posts" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "batch_job_id" uuid NOT NULL, "shortcode" character varying(255) NOT NULL, "post_url" text NOT NULL, "caption" text NOT NULL DEFAULT '', "thumbnail_url" text, "is_video" boolean NOT NULL DEFAULT false, "status" character varying NOT NULL DEFAULT 'pending', "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "UQ_scraped_posts_batch_shortcode" UNIQUE ("batch_job_id", "shortcode"), CONSTRAINT "PK_scraped_posts_id" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `ALTER TABLE "scraped_posts" ADD CONSTRAINT "FK_scraped_posts_batch_job" FOREIGN KEY ("batch_job_id") REFERENCES "scrape_batch_jobs"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "scraped_posts" DROP CONSTRAINT "FK_scraped_posts_batch_job"`,
    );
    await queryRunner.query(`DROP TABLE "scraped_posts"`);
    await queryRunner.query(
      `ALTER TABLE "scrape_batch_jobs" DROP CONSTRAINT "FK_scrape_batch_jobs_source_account"`,
    );
    await queryRunner.query(`DROP TABLE "scrape_batch_jobs"`);
  }
}
