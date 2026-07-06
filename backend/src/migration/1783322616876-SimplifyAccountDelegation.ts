import { MigrationInterface, QueryRunner } from "typeorm";

export class SimplifyAccountDelegation1783322616876 implements MigrationInterface {
    name = 'SimplifyAccountDelegation1783322616876'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "account_delegations" DROP COLUMN "access_level"`);
        await queryRunner.query(`ALTER TABLE "account_delegations" DROP COLUMN "updated_at"`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "account_delegations" ADD "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()`);
        await queryRunner.query(`ALTER TABLE "account_delegations" ADD "access_level" character varying NOT NULL DEFAULT 'viewer'`);
    }

}
