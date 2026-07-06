# Product Requirements Document — master-scrape (skrep-doctor)

> **Status:** REFERENSI — Reverse-engineered dari codebase `/Users/rizkiramadhanx/project lain/master-scrape` pada 2026-07-06. Bukan PRD resmi/asli dari tim produk — disusun dari hasil membaca kode, schema database, dan konfigurasi. Dipakai sebagai bahan referensi/inspirasi planning project lain.

---

## 1. Product Vision

### Elevator Pitch

**master-scrape** (nama internal: *skrep-doctor*) adalah platform auto-repost / cross-posting multi-platform: men-scrape konten dari Instagram (dan menerima feed dari channel Discord), lalu mempublikasikan ulang secara otomatis, terjadwal, atau manual ke Twitter/X, Telegram, Facebook, dan Instagram.

### Problem Statement

Mengelola distribusi konten yang sama ke banyak platform sosial media secara manual memakan waktu dan tidak konsisten. Produk ini mengotomasi alur "temukan konten → simpan → publikasikan ulang ke banyak platform" tanpa campur tangan manual berulang, termasuk untuk sumber yang tidak API-friendly (Instagram).

### Target Users

| Role | Deskripsi | Kebutuhan Utama |
|------|----------|----------------|
| Admin/Operator konten | Single-admin, mengelola akun sosial media terhubung dan aturan repost | Setup cepat, monitoring status publish, kontrol rate-limit untuk hindari ban |

### Catatan Risiko Produk (penting)

Instagram, Twitter/X, dan Facebook diotomasi lewat **Playwright** (browser automation meniru interaksi manusia dengan cookie session), **bukan API resmi** — risiko ban akun diakui eksplisit di kode dan ditampilkan sebagai disclaimer di halaman panduan UI. Hanya Telegram yang memakai Bot API resmi.

---

## 2. User Stories / Use Cases

### Epic 1: Manajemen Akun

| ID | User Story | Priority | Acceptance Criteria |
|----|-----------|----------|-------------------|
| US-001 | Sebagai admin, saya ingin menghubungkan akun di 5 platform berbeda agar bisa publish ke sana | P0 | Akun tersimpan dengan credential (cookie/token), status koneksi bisa dicek |
| US-002 | Sebagai admin, saya ingin mengecek status koneksi akun agar tahu kapan cookie/token expired | P0 | Endpoint check-connection mengembalikan status valid/invalid |

### Epic 2: Scraping Konten

| ID | User Story | Priority | Acceptance Criteria |
|----|-----------|----------|-------------------|
| US-003 | Sebagai admin, saya ingin scrape 1 post Instagram dari link agar bisa dipakai sebagai draft | P0 | Caption dan media resolusi asli berhasil diekstrak dari 1 link |
| US-004 | Sebagai admin, saya ingin scrape banyak post sekaligus (batch) dan melihat progressnya real-time | P0 | Job batch berjalan async, progress terlihat live via WebSocket |
| US-005 | Sebagai admin, saya ingin sistem otomatis memantau akun Instagram tertentu secara berkala | P1 | Observer berjalan via cron dengan interval minimum 60 menit |
| US-006 | Sebagai admin, saya tidak ingin konten yang sama ter-scrape/publish dua kali | P0 | Sistem dedup berdasarkan source item yang sudah diproses |

### Epic 3: Publishing / Cross-posting

| ID | User Story | Priority | Acceptance Criteria |
|----|-----------|----------|-------------------|
| US-007 | Sebagai admin, saya ingin membuat aturan auto-post berbasis trigger agar konten baru otomatis dipublikasikan | P0 | Rule mendukung minimal 4 mode trigger, bisa reload tanpa restart server |
| US-008 | Sebagai admin, saya ingin menjadwalkan post untuk tanggal/jam tertentu | P0 | Post tersimpan sebagai draft berjadwal, dipublikasikan tepat waktu via delayed job |
| US-009 | Sebagai admin, saya ingin publish ke beberapa platform sekaligus dari satu sumber konten | P0 | Satu draft/rule bisa menargetkan >1 platform |
| US-010 | Sebagai admin, saya ingin publish gagal otomatis dicoba ulang agar tidak hilang begitu saja | P1 | Retry otomatis dengan exponential backoff, maksimal 3x |
| US-011 | Sebagai admin, saya ingin melihat riwayat semua publish (berhasil/gagal) sebagai audit trail | P1 | Halaman History menampilkan log lengkap + status queue |

### Epic 4: Onboarding & Guardrail

| ID | User Story | Priority | Acceptance Criteria |
|----|-----------|----------|-------------------|
| US-012 | Sebagai admin baru, saya ingin panduan cara mengambil cookie/token tiap platform | P1 | Halaman Guide berisi instruksi per platform + disclaimer risiko |
| US-013 | Sebagai admin, saya ingin sistem membatasi interval scraping otomatis agar akun tidak di-ban | P0 | Observer tidak bisa diset di bawah interval minimum (60 menit) |

---

## 3. Feature List

### MVP (Minimum Viable Product)

| # | Fitur | Deskripsi | Epic |
|---|-------|----------|------|
| 1 | Manajemen multi-akun (5 platform) | CRUD akun + cek status koneksi | Epic 1 |
| 2 | Scraping Instagram on-demand | Scrape 1 post dari link, ambil caption + media resolusi asli | Epic 2 |
| 3 | Scraping batch dengan progress live | Job BullMQ ter-chain, progress via WebSocket | Epic 2 |
| 4 | Deduplikasi konten | Mencegah re-scrape/re-post item yang sama | Epic 2 |
| 5 | Auto-post rule engine | Rule dengan 4 mode trigger, hot-reload tanpa restart | Epic 3 |
| 6 | Cross-posting multi-platform | Satu sumber → banyak platform tujuan | Epic 3 |
| 7 | Scheduled posting | Draft berjadwal, delayed job, re-scrape media sesaat sebelum publish | Epic 3 |
| 8 | Retry queue dengan backoff | BullMQ retry 3x exponential backoff | Epic 3 |
| 9 | Audit log / riwayat publish | Log lengkap + status queue per item | Epic 3 |
| 10 | Guardrail rate-limit | Interval minimum untuk observer otomatis | Epic 4 |

### Post-MVP / Future

| # | Fitur | Deskripsi | Prioritas |
|---|-------|----------|----------|
| 1 | Sumber konten dari Discord | discord.js-selfbot-v13 sudah ada sebagai dependency, indikasi fitur ini sedang/akan dikembangkan | Medium |
| 2 | Multi-admin / role-based access | Saat ini single-admin via env, belum ada manajemen banyak user | Low |
| 3 | Integrasi API resmi platform (bukan Playwright) | Mengurangi risiko ban dengan migrasi ke API resmi jika tersedia | Medium |

---

## 4. Constraints & Assumptions

### Constraints
- Instagram, Twitter/X, Facebook tidak punya API resmi yang dipakai — bergantung pada Playwright automation + cookie session yang rentan expired/ban
- Media Instagram (CDN link) cepat kedaluwarsa — perlu re-scrape sesaat sebelum publish untuk scheduled post
- Observer otomatis dibatasi interval minimum 60 menit untuk menghindari deteksi bot

### Assumptions
- Hanya ada 1 admin (autentikasi single-admin via credential di environment variable + JWT)
- User bertanggung jawab menyediakan cookie/token valid untuk tiap platform
- Redis dan PostgreSQL tersedia sebagai infrastruktur pendukung (queue dan data persistence)

---

## 5. Success Metrics

| Metric | Target | Cara Ukur |
|--------|--------|----------|
| Tingkat keberhasilan publish | Tinggi | Rasio `post_history` status sukses vs gagal |
| Waktu scraping batch | Cepat, tidak membebani rate-limit | Durasi job BullMQ per batch |
| Deteksi ban akun | Minim | Frekuensi status koneksi akun berubah invalid |

---

## 6. Out of Scope

**Yang TIDAK dibangun di versi ini (berdasarkan observasi kode):**
- Analytics/insight performa konten yang dipublikasikan
- Multi-user/tim dengan role granular
- Integrasi platform sosial media lain di luar 5 yang sudah ada (Instagram, Twitter/X, Telegram, Facebook, dan Discord sebagai sumber)
- Editing/generasi konten otomatis (AI caption generator, dsb) — sistem murni repost apa adanya
