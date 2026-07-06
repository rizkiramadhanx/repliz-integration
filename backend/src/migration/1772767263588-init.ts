import { MigrationInterface, QueryRunner } from "typeorm";

export class Init1772767263588 implements MigrationInterface {
    name = 'Init1772767263588'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "roles" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying(255) NOT NULL, "actions" text DEFAULT '', "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_c1433d71a4838793a49dcad46ab" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "users" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "email" character varying NOT NULL, "name" character varying, "password" character varying NOT NULL, "is_confirmed" boolean NOT NULL DEFAULT false, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "event_id" uuid, "role_id" uuid, CONSTRAINT "UQ_97672ac88f789774dd47f7c8be3" UNIQUE ("email"), CONSTRAINT "PK_a3ffb1c0c8416b9fc6f907b7433" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "logs" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "action" character varying(255) NOT NULL, "user_id" uuid, "timestamp" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "status" character varying(50) NOT NULL, "status_code" character varying(50), CONSTRAINT "PK_fb1b805f2f7795de79fa69340ba" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "participant" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "event_category_id" uuid NOT NULL, "name" character varying(100) NOT NULL, "bird_name" character varying(100), "address" character varying(256), "position" integer, "ranking" integer, "score" integer, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_64da4237f502041781ca15d4c41" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TYPE "public"."registration_event_status_enum" AS ENUM('PENDING', 'REJECTED', 'PAID', 'EXPIRED')`);
        await queryRunner.query(`CREATE TABLE "registration_event" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "event_category_id" uuid NOT NULL, "trx_code" character varying(20), "name" character varying(255) NOT NULL, "phone" character varying(50) NOT NULL, "expired_at" TIMESTAMP WITH TIME ZONE, "time_reregistration" TIMESTAMP WITH TIME ZONE, "status" "public"."registration_event_status_enum" DEFAULT 'PENDING', "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_e273290b4292fe15ea3b0d03511" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "assessment" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "event_category_id" uuid NOT NULL, "name" character varying(255), "value" json, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_c511a7dc128256876b6b1719401" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "event_category" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "event_id" uuid NOT NULL, "name" character varying(255) NOT NULL, "price" integer NOT NULL DEFAULT '0', "max_participant" integer, "description" text, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_697909a55bde1b28a90560f3ae2" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "events" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying(255) NOT NULL, "date" TIMESTAMP WITH TIME ZONE NOT NULL, "address" character varying(500) NOT NULL, "address_url" character varying(500), "image_background" character varying(500), "description" text, "brochure" character varying(500), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_40731c7151fe4be3116e45ddf73" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "history_registration" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "event_category_id" uuid NOT NULL, "event_name" character varying(255) NOT NULL, "event_category_name" character varying(255) NOT NULL, "price" integer NOT NULL DEFAULT '0', "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_5c318f42cb3cc047babe0cf485a" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "financial" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "trx_code" character varying(20), "event_id" uuid NOT NULL, "event_name" character varying(255) NOT NULL, "event_category_id" uuid NOT NULL, "event_category_name" character varying(255) NOT NULL, "name_person" character varying(255) NOT NULL, "phone" character varying(50) NOT NULL, "paid_datetime" TIMESTAMP WITH TIME ZONE, "price" integer NOT NULL DEFAULT '0', "registration_event_id" uuid, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_9095bd42e3bb76c634d7561eb45" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "users" ADD CONSTRAINT "FK_a2cecd1a3531c0b041e29ba46e1" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "logs" ADD CONSTRAINT "FK_70c2c3d40d9f661ac502de51349" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "participant" ADD CONSTRAINT "FK_b646066151a0ecd8637efcab028" FOREIGN KEY ("event_category_id") REFERENCES "event_category"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "registration_event" ADD CONSTRAINT "FK_0494b42a1a5a1adfadd8036e981" FOREIGN KEY ("event_category_id") REFERENCES "event_category"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "assessment" ADD CONSTRAINT "FK_27eef5c5a46886e7b2d42f069da" FOREIGN KEY ("event_category_id") REFERENCES "event_category"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "event_category" ADD CONSTRAINT "FK_f81a9c9dcf8e57514363383fcad" FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "event_category" DROP CONSTRAINT "FK_f81a9c9dcf8e57514363383fcad"`);
        await queryRunner.query(`ALTER TABLE "assessment" DROP CONSTRAINT "FK_27eef5c5a46886e7b2d42f069da"`);
        await queryRunner.query(`ALTER TABLE "registration_event" DROP CONSTRAINT "FK_0494b42a1a5a1adfadd8036e981"`);
        await queryRunner.query(`ALTER TABLE "participant" DROP CONSTRAINT "FK_b646066151a0ecd8637efcab028"`);
        await queryRunner.query(`ALTER TABLE "logs" DROP CONSTRAINT "FK_70c2c3d40d9f661ac502de51349"`);
        await queryRunner.query(`ALTER TABLE "users" DROP CONSTRAINT "FK_a2cecd1a3531c0b041e29ba46e1"`);
        await queryRunner.query(`DROP TABLE "financial"`);
        await queryRunner.query(`DROP TABLE "history_registration"`);
        await queryRunner.query(`DROP TABLE "events"`);
        await queryRunner.query(`DROP TABLE "event_category"`);
        await queryRunner.query(`DROP TABLE "assessment"`);
        await queryRunner.query(`DROP TABLE "registration_event"`);
        await queryRunner.query(`DROP TYPE "public"."registration_event_status_enum"`);
        await queryRunner.query(`DROP TABLE "participant"`);
        await queryRunner.query(`DROP TABLE "logs"`);
        await queryRunner.query(`DROP TABLE "users"`);
        await queryRunner.query(`DROP TABLE "roles"`);
    }

}
