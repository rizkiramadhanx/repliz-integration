import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddTemplateTrigger1783360000000 implements MigrationInterface {
  name = 'AddTemplateTrigger1783360000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "auto_post_rules" ADD "template_media_path" text`,
    );
    await queryRunner.query(
      `ALTER TABLE "auto_post_rules" ADD "template_media_type" character varying`,
    );
    await queryRunner.query(
      `ALTER TABLE "auto_post_rules" ADD "template_caption" text`,
    );
    await queryRunner.query(
      `ALTER TABLE "auto_post_rules" ADD "cron_expression" character varying(100)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "auto_post_rules" DROP COLUMN "cron_expression"`,
    );
    await queryRunner.query(
      `ALTER TABLE "auto_post_rules" DROP COLUMN "template_caption"`,
    );
    await queryRunner.query(
      `ALTER TABLE "auto_post_rules" DROP COLUMN "template_media_type"`,
    );
    await queryRunner.query(
      `ALTER TABLE "auto_post_rules" DROP COLUMN "template_media_path"`,
    );
  }
}
