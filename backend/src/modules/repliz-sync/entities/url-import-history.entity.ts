import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

// Riwayat URL yang pernah diimpor manual. Dipakai untuk MEMPERINGATKAN saat
// URL yang sama ditempel lagi — bukan untuk memblokir, karena mengulang bisa
// disengaja (mis. menjadwalkan ulang ke akun berbeda).
//
// Terpisah dari repliz_synced_posts milik rule otomatis: di sana kuncinya
// (rule_id, target_username, shortcode) dan berfungsi sebagai anti-duplikat
// permanen, sedangkan impor manual tidak terikat rule mana pun.
@Entity('url_import_history')
@Index('IDX_url_import_account_url', ['replizAccountId', 'url'])
@Index('IDX_url_import_job', ['jobId'])
@Index('IDX_url_import_created', ['createdAt'])
export class UrlImportHistoryEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'url', type: 'text' })
  url: string;

  // Duplikat dinilai per akun tujuan: URL yang sama ke akun berbeda adalah
  // tindakan yang wajar, bukan kekeliruan.
  @Column({ name: 'repliz_account_id' })
  replizAccountId: string;

  @Column({ name: 'repliz_schedule_id', type: 'varchar', nullable: true })
  replizScheduleId: string | null;

  // Baris tanpa jobId berasal dari impor sinkron sebelum fitur batch ada;
  // dibiarkan nullable supaya riwayat lama tetap terbaca.
  @Column({ name: 'job_id', type: 'uuid', nullable: true })
  jobId: string | null;

  // 'scheduled' hanya berarti Repliz menerima jadwalnya. Terbit atau
  // tidaknya ditentukan Repliz belakangan dan tidak tercermin di sini.
  @Column({ name: 'status', type: 'varchar', default: 'scheduled' })
  status: 'scheduled' | 'failed';

  @Column({ name: 'error_message', type: 'text', nullable: true })
  errorMessage: string | null;

  // Disimpan agar baris gagal bisa diulang tanpa mengunduh ulang media
  // hanya untuk mengetahui jenis kontennya.
  @Column({ name: 'post_type', type: 'varchar', nullable: true })
  postType: string | null;

  @Column({ name: 'media_count', type: 'int', default: 0 })
  mediaCount: number;

  // Tautan media yang tersimpan di server kita (bukan URL asal platform,
  // yang tokennya kedaluwarsa dalam hitungan jam). Inilah yang juga dikirim
  // ke Repliz, sehingga isi yang dijadwalkan bisa ditinjau ulang dari riwayat.
  @Column({ name: 'media_urls', type: 'jsonb', nullable: true })
  mediaUrls: string[] | null;

  @Column({ name: 'caption', type: 'text', nullable: true })
  caption: string | null;

  @Column({ name: 'scheduled_at', type: 'timestamptz', nullable: true })
  scheduledAt: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
