import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPostTypeToUrlImportJob1724521200000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Kolom ini sempat ditambal manual lewat SQL di produksi saat migration
    // belum terbaca (lihat commit 726551f). Pakai ADD COLUMN IF NOT EXISTS —
    // addColumn() dari TypeORM menghasilkan ALTER TABLE polos yang gagal di
    // database yang kolomnya sudah ada, dan kegagalan itu menghentikan boot
    // container (docker-entrypoint.sh memakai `set -e`).
    await queryRunner.query(
      `ALTER TABLE "url_import_job" ADD COLUMN IF NOT EXISTS "post_type" varchar DEFAULT 'video'`,
    );
    await queryRunner.query(
      `COMMENT ON COLUMN "url_import_job"."post_type" IS 'Post type: ''video'' (feed), ''reel'', atau ''story'' (Instagram Stories)'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "url_import_job" DROP COLUMN IF EXISTS "post_type"`,
    );
  }
}
