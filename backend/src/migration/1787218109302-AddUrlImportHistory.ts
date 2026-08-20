import { MigrationInterface, QueryRunner } from "typeorm";

export class AddUrlImportHistory1787218109302 implements MigrationInterface {
    name = 'AddUrlImportHistory1787218109302'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "url_import_history" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "url" text NOT NULL, "repliz_account_id" character varying NOT NULL, "repliz_schedule_id" character varying, "scheduled_at" TIMESTAMP WITH TIME ZONE, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_2542a0a734f8a3f94fd48e65bbf" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_url_import_account_url" ON "url_import_history" ("repliz_account_id", "url") `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "public"."IDX_url_import_account_url"`);
        await queryRunner.query(`DROP TABLE "url_import_history"`);
    }

}
