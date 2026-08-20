import { MigrationInterface, QueryRunner } from "typeorm";

export class AddSourcePlatform1787201341201 implements MigrationInterface {
    name = 'AddSourcePlatform1787201341201'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "repliz_sync_rules" ADD "source_platform" character varying NOT NULL DEFAULT 'instagram'`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "repliz_sync_rules" DROP COLUMN "source_platform"`);
    }

}
