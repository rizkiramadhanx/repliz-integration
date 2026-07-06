# Module Breakdown — master-scrape (skrep-doctor)

> **Status:** REFERENSI — Reverse-engineered dari codebase `/Users/rizkiramadhanx/project lain/master-scrape` pada 2026-07-06. Lihat juga [master-scrape-prd.md](./master-scrape-prd.md) untuk visi produk dan user stories.

---

## Project Type Declaration

| Item | Value |
|------|-------|
| Project Type | Fullstack (dual-repo: `backend/` + `frontend/`) |
| Backend Stack | Node 22 + TypeScript, Hono, Drizzle ORM + PostgreSQL, BullMQ + Redis, Playwright |
| Frontend Stack | React 19 + Vite, Mantine, React Router v7, Zustand, react-hook-form + Zod |
| Infra | Docker Compose + Traefik (reverse proxy + Let's Encrypt), deploy manual via `deploy.sh` |

---

## 1. Module Map

| # | Module | Deskripsi | Repo | Priority | Dependencies |
|---|--------|----------|------|----------|-------------|
| 1 | Auth | Login single-admin via JWT | both | P0 | — |
| 2 | Accounts | Manajemen akun 5 platform + cek koneksi | both | P0 | Auth |
| 3 | Instagram Scraper Worker | Scraping post Instagram via Playwright | backend | P0 | Accounts (cookie session) |
| 4 | Scrape Batches | Orkestrasi job scraping massal + progress live | both | P0 | Instagram Scraper Worker |
| 5 | Auto Post Rules | Rule engine trigger otomatis publish | both | P0 | Accounts, Scraper |
| 6 | Publishers Worker | Eksekusi publish ke platform tujuan | backend | P0 | Accounts, Queue |
| 7 | Scheduled Posts | Draft & jadwal posting manual | both | P0 | Publishers Worker |
| 8 | Post History | Audit log hasil publish + status queue | both | P1 | Publishers Worker |
| 9 | Guide (Onboarding) | Panduan ambil cookie/token per platform | frontend | P1 | — |
| 10 | Connection Check | Health check koneksi (DB/Redis/dsb) | backend | P1 | — |

**Priority:** P0 = MVP wajib, P1 = penting, P2 = nice to have

---

## 2. Module Detail

### Auth

| Item | Detail |
|------|--------|
| Repo | both |
| Route Prefix | `/login` (backend), semua route lain JWT-protected |
| Guard | JWT middleware di semua route kecuali `/` dan `/login` |
| User Roles | Single-admin (credential dari environment variable) |

**Backend:** Login mengeluarkan JWT, dipakai sebagai bearer token untuk semua request berikutnya.
**Frontend:** Halaman Login, menyimpan token di Zustand store.

---

### Accounts

| Item | Detail |
|------|--------|
| Repo | both |
| Route Prefix | `/accounts` |
| Guard | JWT |
| User Roles | Admin |

**Backend:**

| Key Features | Key Entities (Drizzle) | Key Services |
|-------------|-----------|-------------|
| CRUD akun, check-connection per akun | `accounts` (5 tipe platform, credentials jsonb, status) | Account service, connection checker per platform |

**Frontend:**

| Key Pages | Key Components |
|-----------|---------------|
| Halaman Accounts — master data akun terhubung | Form tambah/edit akun, indikator status koneksi |

**External Dependencies:**
- Cookie session (Instagram, Twitter/X, Facebook), Bot token (Telegram)

---

### Instagram Scraper Worker

| Item | Detail |
|------|--------|
| Repo | backend |
| Route Prefix | — (dipicu internal / via Scrape Batches) |

**Backend:**

| Key Features | Key Entities (Drizzle) | Key Services |
|-------------|-----------|-------------|
| Ekstrak shortcode dari grid profil, ambil detail post per shortcode (caption dari `og:description`, media dari JSON preloader/`image_versions2`) | `scraped_posts`, `processed_source_items` (dedup) | Playwright automation service, dedup checker |

**Alur kerja:**
1. Trigger: manual (1 link), batch (banyak link via job chain), atau otomatis (Instagram Observer via cron, interval minimum 60 menit)
2. Buka profil/post via Playwright dengan cookie session
3. Ekstrak shortcode dari grid (untuk mode profil) atau langsung dari link (mode 1 post)
4. Untuk tiap shortcode: ambil caption + media resolusi asli (bukan dari meta tag `og:image`/`og:video` yang resolusi rendah, tapi dari data JSON preloader)
5. Cek dedup via `processed_source_items` sebelum simpan
6. Simpan ke `scraped_posts`, update progress job

**External Dependencies:**
- Playwright, cookie session Instagram

---

### Scrape Batches

| Item | Detail |
|------|--------|
| Repo | both |
| Route Prefix | `/scrape-batches` |
| Guard | JWT |

**Backend:**

| Key Features | Key Entities (Drizzle) | Key Services |
|-------------|-----------|-------------|
| CRUD batch job, stop job, generate-drafts dari hasil scrape, WebSocket progress live | `scrape_batch_jobs`, `scraped_posts` | BullMQ job orchestrator, WebSocket broadcaster |

**Frontend:**

| Key Pages | Key Components |
|-----------|---------------|
| Modal batch scraping (dari halaman Schedule) | Progress bar real-time (WebSocket), tombol stop |

---

### Auto Post Rules

| Item | Detail |
|------|--------|
| Repo | both |
| Route Prefix | `/auto-post-rules` |
| Guard | JWT |

**Backend:**

| Key Features | Key Entities (Drizzle) | Key Services |
|-------------|-----------|-------------|
| CRUD rule, run-now (trigger manual), hot-reload cron/observer tanpa restart server | `auto_post_rules` (4 tipe trigger) | Rule engine, cron scheduler (node-cron), observer |

**Frontend:**

| Key Pages | Key Components |
|-----------|---------------|
| Halaman Auto Post — wizard pembuatan rule | Form wizard multi-step, pemilihan trigger & target platform |

---

### Publishers Worker

| Item | Detail |
|------|--------|
| Repo | backend |
| Route Prefix | — (dipicu internal via queue) |

**Backend:**

| Key Features | Key Entities (Drizzle) | Key Services |
|-------------|-----------|-------------|
| Publish ke Twitter/X, Telegram, Facebook, Instagram via 2 jalur queue (auto-post-rules dan scheduled-post), retry 3x exponential backoff | `post_history` (log hasil) | Publisher per platform (Playwright automation untuk 3 platform, Bot API untuk Telegram), BullMQ retry handler |

**Catatan teknis penting:** untuk scheduled post, media Instagram di-scrape ULANG sesaat sebelum publish (bukan pakai link CDN lama) karena link CDN Instagram cepat expired.

---

### Scheduled Posts

| Item | Detail |
|------|--------|
| Repo | both |
| Route Prefix | `/scheduled-posts` |
| Guard | JWT |

**Backend:**

| Key Features | Key Entities (Drizzle) | Key Services |
|-------------|-----------|-------------|
| CRUD, generate-from-link, schedule, publish-now, bulk actions | `scheduled_posts` | Scheduler service (delayed job BullMQ) |

**Frontend:**

| Key Pages | Key Components |
|-----------|---------------|
| Halaman Schedule — fitur paling kompleks: draft, modal batch scraping, bulk actions | Content calendar/list, modal generate dari link, bulk action toolbar |

---

### Post History

| Item | Detail |
|------|--------|
| Repo | both |
| Route Prefix | `/post-history` |
| Guard | JWT |

**Backend:**

| Key Features | Key Entities (Drizzle) | Key Services |
|-------------|-----------|-------------|
| List riwayat publish, queue-status | `post_history` | Query service |

**Frontend:**

| Key Pages | Key Components |
|-----------|---------------|
| Halaman History — audit log + polling status queue | Tabel riwayat, badge status (sukses/gagal/pending) |

---

### Guide (Onboarding)

| Item | Detail |
|------|--------|
| Repo | frontend |
| Route Prefix | `/guide` (asumsi) |

**Frontend:**

| Key Pages | Key Components |
|-----------|---------------|
| Halaman Guide — panduan ambil cookie/token per platform + disclaimer risiko ban | Instruksi step-by-step per platform |

---

### Connection Check

| Item | Detail |
|------|--------|
| Repo | backend |
| Route Prefix | `/` (root health check, asumsi) |

**Backend:** Health check koneksi (kemungkinan DB/Redis), dipakai `deploy.sh` untuk verifikasi service up.

---

## 3. Dependency Graph

```text
Auth (BE+FE) → semua module lain (semua route JWT-protected)

Accounts (BE) → Instagram Scraper Worker (BE) — butuh cookie session
Accounts (BE) → Publishers Worker (BE) — butuh credential per platform

Instagram Scraper Worker (BE) → Scrape Batches (BE) — batch orchestration di atas scraper
Scrape Batches (BE) → Scrape Batches (FE) — FE poll/listen progress via WebSocket

Auto Post Rules (BE) → Publishers Worker (BE) — rule trigger memicu publish job
Scheduled Posts (BE) → Publishers Worker (BE) — jadwal memicu publish job (delayed)
Scheduled Posts (BE) → Instagram Scraper Worker (BE) — re-scrape media sesaat sebelum publish

Publishers Worker (BE) → Post History (BE) — setiap publish attempt dicatat

Scrape Batches (FE) → Scheduled Posts (FE) — modal batch scraping dipicu dari halaman Schedule
```

---

## 4. Build Order

| Phase | Modul | Repo | Urutan | Alasan |
|-------|-------|------|--------|--------|
| 1 | Auth, Connection Check | both | Paling dasar | Semua modul depend ke Auth (JWT guard) |
| 2 | Accounts | both | Setelah Auth | Semua worker butuh credential akun |
| 3 | Instagram Scraper Worker | backend | Setelah Accounts | Butuh cookie session dari Accounts |
| 4 | Scrape Batches | backend | Setelah Scraper | Orkestrasi di atas scraper single-post |
| 4 | Scrape Batches | frontend | Paralel dengan BE | FE bisa dibangun paralel setelah kontrak WebSocket/API fix |
| 5 | Publishers Worker | backend | Setelah Accounts | Butuh credential per platform |
| 6 | Auto Post Rules | both | Setelah Scraper + Publishers | Rule engine menghubungkan scraper dan publisher |
| 6 | Scheduled Posts | both | Paralel dengan Auto Post Rules | Sama-sama depend ke Publishers Worker |
| 7 | Post History | both | Setelah Publishers Worker | Butuh data hasil publish untuk ditampilkan |
| 8 | Guide | frontend | Kapan saja | Tidak depend ke modul backend manapun |
