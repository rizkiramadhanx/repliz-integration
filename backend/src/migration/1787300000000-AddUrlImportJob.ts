import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddUrlImportJob1787300000000 implements MigrationInterface {
  name = 'AddUrlImportJob1787300000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "url_import_job" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "repliz_account_id" character varying NOT NULL, "repliz_account_name" character varying, "status" character varying NOT NULL DEFAULT 'running', "total" integer NOT NULL DEFAULT 0, "processed" integer NOT NULL DEFAULT 0, "success" integer NOT NULL DEFAULT 0, "failed" integer NOT NULL DEFAULT 0, "start_date" character varying, "start_time" character varying, "interval_minutes" integer NOT NULL DEFAULT 60, "auto_add_music" boolean NOT NULL DEFAULT false, "message" text, "urls" jsonb, "finished_at" TIMESTAMP WITH TIME ZONE, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_url_import_job" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_url_import_job_created" ON "url_import_job" ("created_at") `,
    );

    // Kolom baru pada riwayat. Semua nullable atau berdefault supaya baris
    // lama (impor sebelum fitur batch) tetap valid tanpa backfill.
    await queryRunner.query(
      `ALTER TABLE "url_import_history" ADD "job_id" uuid`,
    );
    await queryRunner.query(
      `ALTER TABLE "url_import_history" ADD "status" character varying NOT NULL DEFAULT 'scheduled'`,
    );
    await queryRunner.query(
      `ALTER TABLE "url_import_history" ADD "error_message" text`,
    );
    await queryRunner.query(
      `ALTER TABLE "url_import_history" ADD "post_type" character varying`,
    );
    await queryRunner.query(
      `ALTER TABLE "url_import_history" ADD "media_count" integer NOT NULL DEFAULT 0`,
    );
    await queryRunner.query(
      `ALTER TABLE "url_import_history" ADD "caption" text`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_url_import_job" ON "url_import_history" ("job_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_url_import_created" ON "url_import_history" ("created_at") `,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "public"."IDX_url_import_created"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_url_import_job"`);
    await queryRunner.query(
      `ALTER TABLE "url_import_history" DROP COLUMN "caption"`,
    );
    await queryRunner.query(
      `ALTER TABLE "url_import_history" DROP COLUMN "media_count"`,
    );
    await queryRunner.query(
      `ALTER TABLE "url_import_history" DROP COLUMN "post_type"`,
    );
    await queryRunner.query(
      `ALTER TABLE "url_import_history" DROP COLUMN "error_message"`,
    );
    await queryRunner.query(
      `ALTER TABLE "url_import_history" DROP COLUMN "status"`,
    );
    await queryRunner.query(
      `ALTER TABLE "url_import_history" DROP COLUMN "job_id"`,
    );
    await queryRunner.query(`DROP INDEX "public"."IDX_url_import_job_created"`);
    await queryRunner.query(`DROP TABLE "url_import_job"`);
  }
}
