import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAccountsAndDelegations1783320785893
  implements MigrationInterface
{
  name = 'AddAccountsAndDelegations1783320785893';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "account_delegations" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "account_id" uuid NOT NULL, "user_id" uuid NOT NULL, "access_level" character varying NOT NULL DEFAULT 'viewer', "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "UQ_eb024c5269c84e98fc6be82d23c" UNIQUE ("account_id", "user_id"), CONSTRAINT "PK_fd94aaf88ac3543f66ab584f8e6" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "accounts" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "label" character varying(255) NOT NULL, "type" character varying NOT NULL, "credentials" jsonb NOT NULL, "is_active" boolean NOT NULL DEFAULT true, "connection_status" character varying NOT NULL DEFAULT 'unknown', "connection_error" character varying, "last_checked_at" TIMESTAMP WITH TIME ZONE, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_5a7a02c20412299d198e097a8fe" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `ALTER TABLE "account_delegations" ADD CONSTRAINT "FK_ef3581c24b96faa1c20d63f0d6b" FOREIGN KEY ("account_id") REFERENCES "accounts"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "account_delegations" ADD CONSTRAINT "FK_d9abb94683da1f7a397a27b1ac1" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "account_delegations" DROP CONSTRAINT "FK_d9abb94683da1f7a397a27b1ac1"`,
    );
    await queryRunner.query(
      `ALTER TABLE "account_delegations" DROP CONSTRAINT "FK_ef3581c24b96faa1c20d63f0d6b"`,
    );
    await queryRunner.query(`DROP TABLE "accounts"`);
    await queryRunner.query(`DROP TABLE "account_delegations"`);
  }
}
