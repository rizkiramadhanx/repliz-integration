import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export type ReplizSyncRuleStatus = 'active' | 'paused';

// Model: x -> z -> y
//   x = akun pemantau (cookies IG) yang membuka Instagram untuk membaca.
//       Hanya SATU untuk seluruh sistem, ditentukan lewat setelan global
//       (SCRAPE_BROWSING_ACCOUNT_ID) — jadi tidak disimpan per rule.
//   z = akun target yang dikloning kontennya. BISA BANYAK: satu rule =
//       satu z, tambah target berarti tambah rule.
//   y = akun Repliz tujuan posting (replizAccountId).
// x tidak pernah dipakai untuk memposting — yang memposting adalah y lewat
// API resmi Repliz, sehingga akun pemantau tidak terekspos risiko ban.
@Entity('repliz_sync_rules')
@Index('UQ_repliz_sync_rule_target', ['targetUsername'], { unique: true })
export class ReplizSyncRuleEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'label' })
  label: string;

  // Akun "z" — username Instagram target yang dikloning. Unique, supaya
  // satu target tidak bisa didaftarkan dua kali (yang akan membuat konten
  // yang sama terjadwal ganda di Repliz).
  @Column({ name: 'target_username' })
  targetUsername: string;

  // Akun "y" — tujuan posting di Repliz (account id dari
  // GET /public/account).
  @Column({ name: 'repliz_account_id' })
  replizAccountId: string;

  @Column({ name: 'repliz_account_label', nullable: true, type: 'varchar' })
  replizAccountLabel: string | null;

  @Column({ name: 'max_items', type: 'int', default: 25 })
  maxItems: number;

  // Jam mulai posting pertama (format HH:mm, waktu lokal server) dan jarak
  // antar konten dalam menit — dipakai menyusun scheduleAt tiap konten.
  @Column({ name: 'schedule_start_time', default: '06:00' })
  scheduleStartTime: string;

  @Column({ name: 'schedule_interval_minutes', type: 'int', default: 60 })
  scheduleIntervalMinutes: number;

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
