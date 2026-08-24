import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddPostTypeToUrlImportJob1724521200000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn(
      'url_import_job',
      new TableColumn({
        name: 'post_type',
        type: 'varchar',
        isNullable: true,
        default: "'video'",
        comment: "Post type: 'video' (feed), 'reels', atau 'story' (Instagram Stories)",
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('url_import_job', 'post_type');
  }
}
