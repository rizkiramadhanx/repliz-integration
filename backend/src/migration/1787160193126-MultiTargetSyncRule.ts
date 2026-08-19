import { MigrationInterface, QueryRunner } from 'typeorm';

// Satu rule kini menampung banyak target (z). Migration hasil generate
// aslinya melakukan DROP COLUMN lalu ADD COLUMN, yang membuang seluruh
// target rule yang sudah ada — di sini kolomnya dikonversi sehingga nilai
// lama ikut terbawa: 'clipcraftcom' menjadi {'clipcraftcom'}.
export class MultiTargetSyncRule1787160193126 implements MigrationInterface {
  name = 'MultiTargetSyncRule1787160193126';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX "public"."UQ_repliz_sync_rule_target"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."UQ_repliz_synced_rule_shortcode"`,
    );

    // target_username (varchar) -> target_usernames (text[]), nilai lama
    // dibungkus jadi array berisi satu elemen.
    await queryRunner.query(
      `ALTER TABLE "repliz_sync_rules" RENAME COLUMN "target_username" TO "target_usernames"`,
    );
    await queryRunner.query(
      `ALTER TABLE "repliz_sync_rules" ` +
        `ALTER COLUMN "target_usernames" DROP DEFAULT, ` +
        `ALTER COLUMN "target_usernames" TYPE text[] USING ` +
        `CASE WHEN "target_usernames" IS NULL OR "target_usernames" = '' ` +
        `THEN '{}'::text[] ELSE ARRAY["target_usernames"] END, ` +
        `ALTER COLUMN "target_usernames" SET DEFAULT '{}'`,
    );

    // Baris lama hanya punya satu target per rule, jadi target_username-nya
    // diisi dari rule induknya supaya kunci anti-duplikat yang baru tetap
    // konsisten dan riwayat lama tidak dianggap milik target kosong.
    await queryRunner.query(
      `ALTER TABLE "repliz_synced_posts" ADD "target_username" character varying NOT NULL DEFAULT ''`,
    );
    await queryRunner.query(
      `UPDATE "repliz_synced_posts" p ` +
        `SET "target_username" = COALESCE(r."target_usernames"[1], '') ` +
        `FROM "repliz_sync_rules" r WHERE r."id" = p."rule_id"`,
    );

    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_repliz_synced_rule_target_shortcode" ON "repliz_synced_posts" ("rule_id", "target_username", "shortcode")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX "public"."UQ_repliz_synced_rule_target_shortcode"`,
    );
    await queryRunner.query(
      `ALTER TABLE "repliz_synced_posts" DROP COLUMN "target_username"`,
    );

    // Kembali ke satu target per rule: hanya elemen pertama yang bisa
    // dipertahankan — target selain yang pertama memang hilang saat rollback.
    await queryRunner.query(
      `ALTER TABLE "repliz_sync_rules" ` +
        `ALTER COLUMN "target_usernames" DROP DEFAULT, ` +
        `ALTER COLUMN "target_usernames" TYPE character varying USING ` +
        `COALESCE("target_usernames"[1], '')`,
    );
    await queryRunner.query(
      `ALTER TABLE "repliz_sync_rules" RENAME COLUMN "target_usernames" TO "target_username"`,
    );

    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_repliz_synced_rule_shortcode" ON "repliz_synced_posts" ("rule_id", "shortcode")`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_repliz_sync_rule_target" ON "repliz_sync_rules" ("target_username")`,
    );
  }
}
