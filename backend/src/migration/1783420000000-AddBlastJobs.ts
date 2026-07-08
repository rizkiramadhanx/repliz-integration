import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddBlastJobs1783420000000 implements MigrationInterface {
  name = 'AddBlastJobs1783420000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "blast_jobs" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "facebook_account_id" uuid NOT NULL, "media_path" text, "caption" text NOT NULL, "group_ids" jsonb NOT NULL, "gap_minutes" integer NOT NULL, "scheduled_at" TIMESTAMP WITH TIME ZONE NOT NULL, "current_group_index" integer NOT NULL DEFAULT 0, "status" character varying NOT NULL DEFAULT 'running', "error_message" text, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_blast_jobs_id" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `ALTER TABLE "blast_jobs" ADD CONSTRAINT "FK_blast_jobs_facebook_account" FOREIGN KEY ("facebook_account_id") REFERENCES "accounts"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );

    await queryRunner.query(
      `CREATE TABLE "blast_group_results" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "blast_job_id" uuid NOT NULL, "group_id" character varying(255) NOT NULL, "status" character varying NOT NULL, "error_message" text, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_blast_group_results_id" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `ALTER TABLE "blast_group_results" ADD CONSTRAINT "FK_blast_group_results_blast_job" FOREIGN KEY ("blast_job_id") REFERENCES "blast_jobs"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "blast_group_results" DROP CONSTRAINT "FK_blast_group_results_blast_job"`,
    );
    await queryRunner.query(`DROP TABLE "blast_group_results"`);
    await queryRunner.query(
      `ALTER TABLE "blast_jobs" DROP CONSTRAINT "FK_blast_jobs_facebook_account"`,
    );
    await queryRunner.query(`DROP TABLE "blast_jobs"`);
  }
}
