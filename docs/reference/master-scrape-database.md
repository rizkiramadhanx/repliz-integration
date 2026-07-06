# Database Schema — master-scrape (skrep-doctor)

> **Status:** REFERENSI — Diambil langsung dari `backend/src/db/schema.ts` (Drizzle ORM) di `/Users/rizkiramadhanx/project lain/master-scrape` pada 2026-07-06. Lihat juga [master-scrape-prd.md](./master-scrape-prd.md) dan [master-scrape-modules.md](./master-scrape-modules.md).

---

## 1. Database Topology

| Connection | DB Engine | Database Name | ORM |
|-----------|----------|--------------|-----|
| default | PostgreSQL 17 | `master_scrape` | Drizzle ORM (`drizzle-orm/pg-core`) |

---

## 2. Entity Relationship Diagram (ringkas)

```text
accounts ──┬──< auto_post_rules (source_account_id, target_account_ids[])
           ├──< post_history (target_account_id)
           ├──< scheduled_posts (source_account_id, target_account_ids[])
           └──< scrape_batch_jobs (source_account_id)

auto_post_rules ──┬──< post_history (rule_id)
                   └──< processed_source_items (rule_id, CASCADE delete)

scrape_batch_jobs ──< scraped_posts (batch_job_id, CASCADE delete)

users — tabel berdiri sendiri, tidak ada FK ke/dari tabel lain (legacy/tidak dipakai aktif)
```

---

## 3. Tabel & Kolom

### `users`

> Legacy — tidak terhubung ke tabel lain, tidak dipakai untuk auth aktif (auth pakai admin tunggal via environment variable + JWT).

| Kolom | Tipe | Constraint | Keterangan |
|---|---|---|---|
| `id` | serial | PK | |
| `name` | text | NOT NULL | |
| `created_at` | timestamp | NOT NULL, default now() | |

---

### `accounts`

Akun sosial media yang terhubung ke sistem, dipakai sebagai sumber scraping maupun target publish.

| Kolom | Tipe | Constraint | Keterangan |
|---|---|---|---|
| `id` | serial | PK | |
| `label` | text | NOT NULL | Nama tampilan akun |
| `type` | text (enum) | NOT NULL | `twitter`, `telegram`, `facebook`, `discord`, `instagram` |
| `credentials` | jsonb | NOT NULL | Cookie session / bot token, bentuk bebas per platform |
| `is_active` | boolean | NOT NULL, default `true` | |
| `connection_status` | text (enum) | NOT NULL, default `unknown` | `unknown`, `connected`, `disconnected`, `error` |
| `connection_error` | text | nullable | Pesan error terakhir saat cek koneksi |
| `last_checked_at` | timestamp | nullable | |
| `created_at` | timestamp | NOT NULL, default now() | |
| `updated_at` | timestamp | NOT NULL, default now() | |

---

### `auto_post_rules`

Rule engine — menentukan kapan dan bagaimana konten otomatis dipublikasikan.

| Kolom | Tipe | Constraint | Keterangan |
|---|---|---|---|
| `id` | serial | PK | |
| `name` | text | NOT NULL | |
| `trigger_type` | text (enum) | NOT NULL | `discord_observer`, `discord_cron`, `template`, `instagram_observer` |
| `source_account_id` | integer | FK → `accounts.id` | Dipakai untuk `discord_observer`/`discord_cron` (sumber channel) dan `instagram_observer` (akun browsing/scraping) |
| `discord_channel_ids` | jsonb (`string[]`) | nullable | Untuk `discord_observer`/`discord_cron` |
| `media_types` | jsonb (`MediaType[]`) | NOT NULL, default `['image','video']` | Filter tipe media yang diproses |
| `instagram_target_usernames` | jsonb (`string[]`) | nullable | Untuk `instagram_observer` — akun yang dipantau |
| `exclude_keywords` | jsonb (`string[]`) | nullable | Filter caption yang dikecualikan |
| `include_original_caption` | boolean | NOT NULL, default `true` | |
| `cron_expression` | text | nullable | Untuk `discord_cron`, `template`, `instagram_observer` |
| `template_text` | text | nullable | Untuk trigger `template` |
| `template_media_url` | text | nullable | Untuk trigger `template` |
| `caption_suffix` | text | nullable | Teks tambahan di akhir caption saat publish |
| `target_account_ids` | jsonb (`number[]`) | NOT NULL | Daftar `accounts.id` tujuan publish |
| `is_active` | boolean | NOT NULL, default `true` | |
| `created_at` | timestamp | NOT NULL, default now() | |
| `updated_at` | timestamp | NOT NULL, default now() | |

---

### `post_history`

Audit log setiap hasil publish (berhasil/gagal).

| Kolom | Tipe | Constraint | Keterangan |
|---|---|---|---|
| `id` | serial | PK | |
| `rule_id` | integer | FK → `auto_post_rules.id`, ON DELETE SET NULL | |
| `target_account_id` | integer | FK → `accounts.id`, ON DELETE SET NULL | |
| `source_label` | text | nullable | |
| `source_url` | text | nullable | |
| `trigger_source` | text (enum) | nullable | `manual`, `cron`, `observer` |
| `caption` | text | nullable | |
| `post_url` | text | nullable | URL hasil post setelah berhasil publish |
| `status` | text (enum) | NOT NULL | `pending`, `success`, `failed` |
| `attempts` | integer | NOT NULL, default `0` | Jumlah percobaan (untuk retry tracking) |
| `error_message` | text | nullable | |
| `posted_at` | timestamp | NOT NULL, default now() | |
| `updated_at` | timestamp | NOT NULL, default now() | |

---

### `processed_source_items`

Dedup — mencegah item sumber yang sama diproses ulang oleh rule yang sama.

| Kolom | Tipe | Constraint | Keterangan |
|---|---|---|---|
| `id` | serial | PK | |
| `rule_id` | integer | NOT NULL, FK → `auto_post_rules.id`, ON DELETE CASCADE | |
| `source_item_id` | text | NOT NULL | ID unik item sumber (mis. shortcode Instagram, ID pesan Discord) |
| `processed_at` | timestamp | NOT NULL, default now() | |

---

### `scheduled_posts`

Draft dan jadwal posting manual.

| Kolom | Tipe | Constraint | Keterangan |
|---|---|---|---|
| `id` | serial | PK | |
| `source_account_id` | integer | FK → `accounts.id`, ON DELETE SET NULL | |
| `source_url` | text | nullable | |
| `caption` | text | NOT NULL, default `''` | |
| `media_path` | text | nullable | |
| `thumbnail_url` | text | nullable | |
| `is_video` | boolean | NOT NULL, default `false` | |
| `target_account_ids` | jsonb (`number[]`) | NOT NULL, default `[]` | |
| `scheduled_at` | timestamp | nullable | Waktu publish terjadwal |
| `status` | text (enum) | NOT NULL, default `draft` | `draft`, `scheduled`, `publishing`, `success`, `failed`, `cancelled` |
| `job_id` | text | nullable | ID job BullMQ terkait (delayed job) |
| `error_message` | text | nullable | |
| `created_at` | timestamp | NOT NULL, default now() | |
| `updated_at` | timestamp | NOT NULL, default now() | |

---

### `scrape_batch_jobs`

Job scraping massal (batch) dari satu akun sumber.

| Kolom | Tipe | Constraint | Keterangan |
|---|---|---|---|
| `id` | serial | PK | |
| `source_account_id` | integer | NOT NULL, FK → `accounts.id` | Akun Instagram yang dipakai untuk browsing/scraping |
| `target_username` | text | NOT NULL | Username Instagram yang di-scrape |
| `batch_size` | integer | NOT NULL, default `10` | Jumlah post per batch fetch |
| `total_limit` | integer | NOT NULL | Total maksimum post yang ingin diambil |
| `fetched_count` | integer | NOT NULL, default `0` | Progress — jumlah post yang sudah berhasil diambil |
| `status` | text (enum) | NOT NULL, default `running` | `running`, `stopped`, `completed`, `failed` |
| `error_message` | text | nullable | |
| `created_at` | timestamp | NOT NULL, default now() | |
| `updated_at` | timestamp | NOT NULL, default now() | |

---

### `scraped_posts`

Hasil scraping individual dari sebuah batch job.

| Kolom | Tipe | Constraint | Keterangan |
|---|---|---|---|
| `id` | serial | PK | |
| `batch_job_id` | integer | NOT NULL, FK → `scrape_batch_jobs.id`, ON DELETE CASCADE | |
| `shortcode` | text | NOT NULL | Shortcode post Instagram |
| `post_url` | text | NOT NULL | |
| `caption` | text | NOT NULL, default `''` | |
| `thumbnail_url` | text | nullable | |
| `is_video` | boolean | NOT NULL, default `false` | |
| `status` | text (enum) | NOT NULL, default `pending` | `pending`, `used` (sudah dipakai jadi scheduled post) |
| `created_at` | timestamp | NOT NULL, default now() | |

**Unique constraint:** `(batch_job_id, shortcode)` — mencegah post yang sama tersimpan dua kali dalam satu batch.

---

## 4. Enum Reference (ringkasan seluruh nilai valid)

| Enum | Nilai |
|---|---|
| `accountTypes` | `twitter`, `telegram`, `facebook`, `discord`, `instagram` |
| `connectionStatuses` | `unknown`, `connected`, `disconnected`, `error` |
| `autoPostTriggerTypes` | `discord_observer`, `discord_cron`, `template`, `instagram_observer` |
| `mediaTypes` | `image`, `video` |
| `postHistoryStatuses` | `pending`, `success`, `failed` |
| `triggerSources` | `manual`, `cron`, `observer` |
| `scheduledPostStatuses` | `draft`, `scheduled`, `publishing`, `success`, `failed`, `cancelled` |
| `scrapeBatchJobStatuses` | `running`, `stopped`, `completed`, `failed` |
| `scrapedPostStatuses` | `pending`, `used` |

---

## 5. Catatan Desain

- Semua relasi memakai `integer` FK ke `serial` PK (bukan UUID) — berbeda dari konvensi boilerplate `ternak-sosmed` (yang pakai UUID via `uuid_generate_v4()`).
- Field target/list akun (`target_account_ids`, `discord_channel_ids`, dst) disimpan sebagai `jsonb` array, bukan tabel pivot/junction terpisah — trade-off simplicity vs query-ability relasi many-to-many.
- `credentials` di tabel `accounts` disimpan sebagai `jsonb` bebas skema — bentuknya berbeda-beda tergantung `type` (cookie session vs bot token), tidak divalidasi di level database.
- Tidak ada soft-delete (`deleted_at`) di tabel manapun — semua delete bersifat hard delete, memakai `ON DELETE CASCADE`/`SET NULL` di level FK.
