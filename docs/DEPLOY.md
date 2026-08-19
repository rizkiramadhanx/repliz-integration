# Deploy ke VPS (Hermes)

Panduan deploy stack **ternak-sosmed + integrasi Repliz** ke VPS memakai
Docker Compose di belakang Traefik (reverse proxy + TLS otomatis).

---

## 0. Ringkasan arsitektur

```
Internet
   │
   ▼
Traefik (:80, :443)  ── TLS Let's Encrypt otomatis
   │
   ├── app.domain.com   →  frontend (nginx, static build React)
   └── api.domain.com   →  backend  (NestJS + Playwright)
                              │
                              ├── postgres   (network internal, TIDAK publik)
                              ├── redis      (network internal, TIDAK publik)
                              └── volume app_uploads → /usr/src/app/uploads
```

Hanya Traefik yang membuka port ke internet. Postgres dan Redis berada di
network `internal` dan tidak bisa dijangkau dari luar.

---

## 1. Prasyarat (sekali di awal)

- Docker + Docker Compose terpasang di VPS
- DNS **A-record** sudah mengarah ke IP VPS:
  - `BACKEND_DOMAIN` → mis. `api.domain.com`
  - `FRONTEND_DOMAIN` → mis. `app.domain.com`
- Port **80** dan **443** terbuka di firewall
- Kredensial Repliz dari Dashboard → Settings → API

Verifikasi DNS sudah propagasi sebelum lanjut:

```bash
dig +short api.domain.com
dig +short app.domain.com
# keduanya harus mengembalikan IP VPS
```

---

## 2. Jalankan Traefik (sekali saja)

Traefik berjalan sebagai stack terpisah supaya tidak perlu restart tiap
deploy aplikasi.

```bash
cd traefik-manual
ACME_EMAIL=kamu@domain.com docker compose -f docker-compose.traefik.yml up -d
cd ..
```

Ganti `ACME_EMAIL` dengan email asli — dipakai Let's Encrypt untuk
notifikasi kedaluwarsa sertifikat.

---

## 3. Siapkan `.env`

```bash
cp .env.example .env
nano .env
```

### Wajib diisi

| Variabel | Keterangan |
|---|---|
| `BACKEND_DOMAIN` | Domain API, mis. `api.domain.com` |
| `FRONTEND_DOMAIN` | Domain frontend, mis. `app.domain.com` |
| `DB_USERNAME`, `DB_PASSWORD`, `DB_NAME` | Kredensial Postgres |
| `JWT_SECRET`, `JWT_SECRET_REFRESH` | String acak panjang — compose **gagal start** kalau kosong |

Generate secret yang kuat:

```bash
openssl rand -base64 48   # jalankan 2x, untuk JWT_SECRET & JWT_SECRET_REFRESH
```

### Untuk fitur Repliz

| Variabel | Keterangan |
|---|---|
| `REPLIZ_ACCESS_KEY` | Dari Dashboard Repliz → Settings → API |
| `REPLIZ_SECRET_KEY` | idem |
| `REPLIZ_BASE_URL` | Opsional, default `https://api.repliz.com` |
| `PUBLIC_BASE_URL` | **Opsional** — default otomatis ke `https://${BACKEND_DOMAIN}` |
| `SCRAPE_BROWSING_ACCOUNT_ID` | Opsional — UUID akun pemantau (x). Kosong = pakai akun Instagram pertama |

> **`PUBLIC_BASE_URL` tidak perlu diisi manual saat deploy.** Nilainya
> otomatis mengikuti `BACKEND_DOMAIN`. Yang penting: URL ini **harus bisa
> diakses dari internet**, karena **server Repliz** yang mengunduh file
> media — bukan browser pengguna. `localhost` akan ditolak sistem dengan
> pesan eksplisit.

### Opsional — email alert

| Variabel | Keterangan |
|---|---|
| `MAIL_HOST`, `MAIL_PORT`, `MAIL_USER`, `MAIL_PASS`, `MAIL_FROM` | SMTP |
| `ALERT_TARGET_EMAIL` | Tujuan alert saat akun terputus |

Tanpa ini, alert di-skip otomatis (tetap tercatat di log) dan aplikasi
tetap berjalan normal.

---

## 4. Deploy

```bash
./deploy.sh
```

Script akan otomatis:

1. Cek `.env` ada
2. Buat network `ternak-sosmed-network` bila belum ada
3. Cek Traefik sudah berjalan
4. `git pull --ff-only` (bila direktori ini repo git)
5. `docker compose up -d --build`
6. Menunggu backend healthy lalu menampilkan status

---

## 5. Migration & seeder (setelah deploy pertama)

```bash
docker compose -f docker-compose.yml exec backend npm run migration:run
docker compose -f docker-compose.yml exec backend node dist/seeder/seeder-runner.js
```

Seeder membuat role beserta permission (termasuk `repliz:read` dan
`repliz-sync:*`) dan user default:

| Email | Password | Role |
|---|---|---|
| `admin@example.com` | `Admin123!` | Admin |
| `operator@example.com` | `Operator123!` | Operator |

> **Ganti password default segera setelah login pertama.**

---

## 6. Verifikasi

```bash
curl -I https://app.domain.com          # frontend
curl -I https://api.domain.com/api      # backend
docker compose -f docker-compose.yml ps # semua service Up
```

### Uji integrasi Repliz

```bash
# 1. Login, ambil token
TOKEN=$(curl -s -X POST https://api.domain.com/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"admin@example.com","password":"Admin123!"}' \
  | python3 -c "import sys,json;print(json.load(sys.stdin)['data']['access_token'])")

# 2. Akun Repliz terbaca?
curl -s "https://api.domain.com/api/repliz/account?page=1&limit=20" \
  -H "Authorization: Bearer $TOKEN"

# 3. Media bisa diakses publik? (WAJIB untuk Repliz)
curl -I https://api.domain.com/uploads/
```

Langkah 3 penting: kalau ini tidak `200`/`403` melainkan gagal koneksi,
server Repliz tidak akan bisa mengunduh media dan sinkronisasi akan gagal.

---

## 7. Setup fitur sinkronisasi

1. Login ke `https://app.domain.com`
2. Menu **Account** → tambahkan akun Instagram pemantau (**x**) beserta
   cookies. Akun ini hanya dipakai membaca, tidak pernah memposting.
3. *(Opsional)* Salin UUID akun tersebut ke `SCRAPE_BROWSING_ACCOUNT_ID`
   di `.env`, lalu `./deploy.sh` ulang. Kalau dilewati, sistem memakai
   akun Instagram pertama yang terdaftar.
4. Menu **Repliz** → pastikan akun tujuan (**y**) muncul dan `connected`
5. Menu **Sinkronisasi Repliz** → **Tambah Rule**:
   - Target (**z**) — username Instagram yang dikloning
   - Akun Repliz (**y**) — tujuan posting
   - Maks konten (default 25), jam mulai (default 06:00), jeda (default 60 menit)
6. Klik tombol **▶ jalankan** untuk menguji langsung tanpa menunggu cron

Cron berjalan otomatis setiap hari **05:00 WIB**.

---

## Update / redeploy

```bash
./deploy.sh
```

Jalankan `migration:run` lagi bila ada migration baru.

---

## Rollback

```bash
git reset --hard <commit_aman>
docker compose -f docker-compose.yml up -d --build
docker compose -f docker-compose.yml exec backend npm run migration:revert  # bila perlu
```

---

## Log & troubleshooting

```bash
docker compose -f docker-compose.yml logs -f backend
docker compose -f docker-compose.yml logs -f frontend
docker logs -f traefik-manual-traefik-1     # routing & TLS
```

### Masalah umum

| Gejala | Penyebab & solusi |
|---|---|
| Compose gagal start, menyebut JWT | `JWT_SECRET` / `JWT_SECRET_REFRESH` kosong di `.env` |
| Sertifikat TLS tidak terbit | DNS belum propagasi, atau port 80 tertutup (Let's Encrypt pakai HTTP challenge) |
| `PUBLIC_BASE_URL ... mengarah ke localhost` | Isi `BACKEND_DOMAIN` dengan domain publik, bukan localhost |
| Sinkronisasi gagal unduh media | Cek `https://api.domain.com/uploads/` bisa diakses dari luar VPS |
| Menu baru tidak muncul di sidebar | Logout–login ulang; permission disimpan di sesi saat login |
| Scrape gagal / akun terputus | Cookies akun pemantau kedaluwarsa — perbarui lewat menu Account |

---

## Catatan keamanan

- **`.env` jangan pernah di-commit.** Sudah masuk `.gitignore`, dan
  `.dockerignore` di `backend/` maupun `frontend/` memastikan file itu
  tidak ikut ter-copy ke dalam image.
- **Kredensial Repliz hanya ada di server.** Frontend memanggil backend
  (`/api/repliz/*`) yang meneruskan ke Repliz. Key tidak pernah dikirim ke
  browser — sengaja tidak memakai `VITE_*`, karena semua variabel `VITE_*`
  ikut ter-bundle ke JavaScript publik yang bisa dibaca lewat DevTools.
- **Postgres & Redis tidak membuka port ke host** pada `docker-compose.yml`
  (production). Hanya `docker-compose.dev.yml` yang mem-publish port untuk
  keperluan development lokal.
- **Backend berjalan sebagai non-root** (`pwuser`, bawaan image Playwright).
- Ganti password user default setelah login pertama.

### Volume `app_uploads`

Media hasil scrape disimpan di volume `app_uploads`. Volume ini **aman saat
redeploy biasa**, tetapi `docker compose down -v` akan **menghapusnya
permanen**. Bila ada konten yang sudah terjadwal di Repliz namun filenya
hilang, postingan tersebut akan gagal terbit.

Backup berkala:

```bash
docker run --rm -v ternak-sosmed_app_uploads:/data -v $(pwd):/backup \
  alpine tar czf /backup/uploads-$(date +%F).tar.gz -C /data .
```
