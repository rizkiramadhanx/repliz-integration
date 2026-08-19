import { MigrationInterface, QueryRunner } from "typeorm";

export class AddReplizSync1787154428200 implements MigrationInterface {
    name = 'AddReplizSync1787154428200'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "repliz_sync_rules" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "label" character varying NOT NULL, "target_username" character varying NOT NULL, "repliz_account_id" character varying NOT NULL, "repliz_account_label" character varying, "max_items" integer NOT NULL DEFAULT '25', "schedule_start_time" character varying NOT NULL DEFAULT '06:00', "schedule_interval_minutes" integer NOT NULL DEFAULT '60', "scrape_mode" character varying NOT NULL DEFAULT 'posts', "status" character varying NOT NULL DEFAULT 'active', "last_run_at" TIMESTAMP WITH TIME ZONE, "last_run_status" character varying, "last_run_message" text, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_1ded6b03144897883b9dd525999" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "UQ_repliz_sync_rule_target" ON "repliz_sync_rules" ("target_username") `);
        await queryRunner.query(`CREATE TABLE "repliz_synced_posts" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "rule_id" uuid NOT NULL, "shortcode" character varying NOT NULL, "post_url" text, "caption" text, "media_url" text, "is_video" boolean NOT NULL DEFAULT false, "repliz_schedule_id" character varying, "scheduled_at" TIMESTAMP WITH TIME ZONE, "status" character varying NOT NULL DEFAULT 'scheduled', "error_message" text, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_c8b7e5e7a420f43f9d5c9500b59" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "UQ_repliz_synced_rule_shortcode" ON "repliz_synced_posts" ("rule_id", "shortcode") `);
        await queryRunner.query(`ALTER TABLE "repliz_synced_posts" ADD CONSTRAINT "FK_09c55d650b04f608f71e4b3502f" FOREIGN KEY ("rule_id") REFERENCES "repliz_sync_rules"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "repliz_synced_posts" DROP CONSTRAINT "FK_09c55d650b04f608f71e4b3502f"`);
        await queryRunner.query(`DROP INDEX "public"."UQ_repliz_synced_rule_shortcode"`);
        await queryRunner.query(`DROP TABLE "repliz_synced_posts"`);
        await queryRunner.query(`DROP INDEX "public"."UQ_repliz_sync_rule_target"`);
        await queryRunner.query(`DROP TABLE "repliz_sync_rules"`);
    }

}
