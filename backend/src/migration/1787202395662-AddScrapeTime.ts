import { MigrationInterface, QueryRunner } from "typeorm";

export class AddScrapeTime1787202395662 implements MigrationInterface {
    name = 'AddScrapeTime1787202395662'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "repliz_sync_rules" ADD "scrape_time" character varying NOT NULL DEFAULT '05:00'`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "repliz_sync_rules" DROP COLUMN "scrape_time"`);
    }

}
