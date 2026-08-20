import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

export type ReplizSyncRuleStatus = 'active' | 'paused';
export type ReplizSyncSourcePlatform = 'instagram' | 'facebook' | 'tiktok';

// Model: x -> z -> y
//   x = akun pemantau (cookies IG) yang membuka Instagram untuk membaca.
//       Dipilih otomatis dari akun terdaftar yang tipenya cocok dengan
//       sourcePlatform — jadi tidak disimpan per rule.
//   z = akun target yang dikloning kontennya. BISA BANYAK dalam satu rule
//       (targetUsernames), semuanya memakai setelan jadwal yang sama.
//   y = akun Repliz tujuan posting (replizAccountId).
// x tidak pernah dipakai untuk memposting — yang memposting adalah y lewat
// API resmi Repliz, sehingga akun pemantau tidak terekspos risiko ban.
@Entity('repliz_sync_rules')
export class ReplizSyncRuleEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'label' })
  label: string;

  // Akun "z" — daftar username Instagram yang dikloning. Disimpan sebagai
  // array supaya satu rule bisa menangani banyak target dengan setelan
  // jadwal yang sama; tiap target tetap dipisahkan saat scraping dan
  // pencatatan anti-duplikat.
  @Column({ name: 'target_usernames', type: 'text', array: true, default: () => "'{}'" })
  targetUsernames: string[];

  // Akun "y" — tujuan posting di Repliz (account id dari
  // GET /public/account).
  @Column({ name: 'repliz_account_id' })
  replizAccountId: string;

  @Column({ name: 'repliz_account_label', nullable: true, type: 'varchar' })
  replizAccountLabel: string | null;

  @Column({ name: 'max_items', type: 'int', default: 25 })
  maxItems: number;

  // Jam scrape rule ini dijalankan (HH:mm, WIB). Terpisah dari
  // scheduleStartTime supaya beban scraping bisa disebar: rule yang terbit
  // siang tidak perlu ikut di-scrape bersamaan pada dini hari. Cron berjalan
  // tiap jam dan hanya menjalankan rule yang jamnya cocok.
  @Column({ name: 'scrape_time', default: '05:00' })
  scrapeTime: string;

  // Jam mulai posting pertama (format HH:mm, waktu lokal server) dan jarak
  // antar konten dalam menit — dipakai menyusun scheduleAt tiap konten.
  @Column({ name: 'schedule_start_time', default: '06:00' })
  scheduleStartTime: string;

  @Column({ name: 'schedule_interval_minutes', type: 'int', default: 60 })
  scheduleIntervalMinutes: number;

  // Platform sumber konten. Akun pemantau (x) yang dipakai menyesuaikan
  // platform ini — scraping Facebook butuh cookies akun Facebook, bukan
  // Instagram.
  @Column({ name: 'source_platform', default: 'instagram' })
  sourcePlatform: ReplizSyncSourcePlatform;

  // Berlaku untuk kedua platform: Instagram memakai /reels/, Facebook
  // memakai tab ?sk=reels_tab.
  @Column({ name: 'scrape_mode', default: 'posts' })
  scrapeMode: 'posts' | 'reels';

  @Column({ name: 'status', default: 'active' })
  status: ReplizSyncRuleStatus;

  @Column({ name: 'last_run_at', type: 'timestamptz', nullable: true })
  lastRunAt: Date | null;

  @Column({ name: 'last_run_status', type: 'varchar', nullable: true })
  lastRunStatus: string | null;

  @Column({ name: 'last_run_message', type: 'text', nullable: true })
  lastRunMessage: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
