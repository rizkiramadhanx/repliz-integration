import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

// Satu batch impor URL. Dipisah dari itemnya supaya UI bisa menampilkan
// kemajuan (mis. "412 dari 2.000") tanpa menghitung ulang ribuan baris
// setiap kali halaman disegarkan.
@Entity('url_import_job')
@Index('IDX_url_import_job_created', ['createdAt'])
export class UrlImportJobEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'repliz_account_id' })
  replizAccountId: string;

  // Disalin saat job dibuat, bukan di-join saat dibaca: nama akun di Repliz
  // bisa berubah atau akunnya dicabut, sedangkan riwayat harus tetap
  // menjelaskan ke mana konten dulu dikirim.
  @Column({ name: 'repliz_account_name', type: 'varchar', nullable: true })
  replizAccountName: string | null;

  @Column({ name: 'status', type: 'varchar', default: 'running' })
  status: 'running' | 'done' | 'failed' | 'canceled';

  @Column({ name: 'total', type: 'int', default: 0 })
  total: number;

  @Column({ name: 'processed', type: 'int', default: 0 })
  processed: number;

  @Column({ name: 'success', type: 'int', default: 0 })
  success: number;

  @Column({ name: 'failed', type: 'int', default: 0 })
  failed: number;

  // Parameter penjadwalan disimpan agar "Ulangi yang gagal" bisa memakai
  // pengaturan yang sama tanpa meminta pengguna mengisinya lagi.
  @Column({ name: 'start_date', type: 'varchar', nullable: true })
  startDate: string | null;

  @Column({ name: 'start_time', type: 'varchar', nullable: true })
  startTime: string | null;

  @Column({ name: 'interval_minutes', type: 'int', default: 60 })
  intervalMinutes: number;

  @Column({ name: 'auto_add_music', type: 'boolean', default: false })
  autoAddMusic: boolean;

  @Column({ name: 'post_type', type: 'varchar', default: 'video', nullable: true })
  postType?: 'video' | 'reel' | 'story' | null;

  // Offset zona waktu pengguna saat job dibuat (konvensi
  // Date.getTimezoneOffset(): WIB = -420). Disimpan agar "Ulangi gagal"
  // menjadwalkan pada jam yang sama seperti impor aslinya.
  @Column({ name: 'timezone_offset_minutes', type: 'int', default: 0 })
  timezoneOffsetMinutes: number;

  @Column({ name: 'message', type: 'text', nullable: true })
  message: string | null;

  // Seluruh URL batch ini. Diperlukan agar URL yang BELUM sempat diproses
  // (mis. server dimulai ulang di tengah jalan) tetap bisa diulang —
  // baris riwayat hanya ada untuk URL yang sudah dicoba.
  @Column({ name: 'urls', type: 'jsonb', nullable: true })
  urls: string[] | null;

  @Column({ name: 'finished_at', type: 'timestamptz', nullable: true })
  finishedAt: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
