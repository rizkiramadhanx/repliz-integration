import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddImportMediaUrls1787400000000 implements MigrationInterface {
  name = 'AddImportMediaUrls1787400000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Nullable: baris riwayat lama tidak menyimpan tautan medianya, dan tidak
    // bisa diisi ulang karena media aslinya sudah diunduh sejak lama.
    await queryRunner.query(
      `ALTER TABLE "url_import_history" ADD "media_urls" jsonb`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "url_import_history" DROP COLUMN "media_urls"`,
    );
  }
}
