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

  @Column({ name: 'scheduled_at', type: 'timestamptz', nullable: true })
  scheduledAt: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
