import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddInstagramScrapeMode1783410000000
  implements MigrationInterface
{
  name = 'AddInstagramScrapeMode1783410000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "auto_post_rules" ADD "instagram_scrape_mode" character varying NOT NULL DEFAULT 'posts'`,
    );
    await queryRunner.query(
      `ALTER TABLE "scrape_batch_jobs" ADD "scrape_mode" character varying NOT NULL DEFAULT 'posts'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "scrape_batch_jobs" DROP COLUMN "scrape_mode"`,
    );
    await queryRunner.query(
      `ALTER TABLE "auto_post_rules" DROP COLUMN "instagram_scrape_mode"`,
    );
  }
}
