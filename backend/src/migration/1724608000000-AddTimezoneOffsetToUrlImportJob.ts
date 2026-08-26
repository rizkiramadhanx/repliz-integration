import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddTimezoneOffsetToUrlImportJob1724608000000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    // post_type ikut dijamin ada di sini: migration sebelumnya sempat tidak
    // terbaca di sebagian instalasi, sehingga kolomnya hilang di produksi.
    await queryRunner.query(
      `ALTER TABLE "url_import_job" ADD COLUMN IF NOT EXISTS "post_type" varchar DEFAULT 'video'`,
    );
    await queryRunner.query(
      `ALTER TABLE "url_import_job" ADD COLUMN IF NOT EXISTS "timezone_offset_minutes" integer NOT NULL DEFAULT 0`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "url_import_job" DROP COLUMN IF EXISTS "timezone_offset_minutes"`,
    );
  }
}
