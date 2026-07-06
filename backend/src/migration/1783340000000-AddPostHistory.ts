import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPostHistory1783340000000 implements MigrationInterface {
  name = 'AddPostHistory1783340000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "post_history" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "rule_id" uuid, "rule_name" character varying(255), "target_account_id" uuid, "platform" character varying NOT NULL, "target_ref" character varying, "media_type" character varying NOT NULL, "trigger_source" character varying NOT NULL, "source_label" character varying, "source_url" text, "caption" text, "post_url" text, "status" character varying NOT NULL DEFAULT 'pending', "attempts" integer NOT NULL DEFAULT 1, "error_message" text, "posted_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_post_history_id" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `ALTER TABLE "post_history" ADD CONSTRAINT "FK_post_history_rule" FOREIGN KEY ("rule_id") REFERENCES "auto_post_rules"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "post_history" ADD CONSTRAINT "FK_post_history_account" FOREIGN KEY ("target_account_id") REFERENCES "accounts"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "post_history" DROP CONSTRAINT "FK_post_history_account"`,
    );
    await queryRunner.query(
      `ALTER TABLE "post_history" DROP CONSTRAINT "FK_post_history_rule"`,
    );
    await queryRunner.query(`DROP TABLE "post_history"`);
  }
}
