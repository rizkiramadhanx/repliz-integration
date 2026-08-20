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
| `PUBLIC_BASE_URL` | **Opsional** — otomatis `https://${BACKEND_DOMAIN}`. Isi hanya bila domainnya berbeda (mis. tunnel). **Jangan tulis port** (lihat catatan di bawah) |

Akun pemantau (**x**) tidak lagi dikonfigurasi lewat env: sistem otomatis
memakai akun terdaftar yang tipenya cocok dengan platform sumber rule, dan
mendahulukan yang berstatus `connected`.

> **`PUBLIC_BASE_URL` tidak perlu diisi manual saat deploy.** Nilainya
> otomatis mengikuti `BACKEND_DOMAIN`. Yang penting: URL ini **harus bisa
> diakses dari internet**, karena **server Repliz** yang mengunduh file
> media — bukan browser pengguna. `localhost` akan ditolak sistem dengan
> pesan eksplisit.
>
> **Jangan pernah menulis port aplikasi di URL https**, mis.
> `https://api.domain.com:4000`. TLS diterminasi Traefik di port **443**,
> sedangkan port 4000 melayani **HTTP polos** — mengaksesnya lewat https
> menghasilkan `ERR_SSL_PROTOCOL_ERROR` dan media gagal diunduh Repliz.
> Yang benar cukup `https://api.domain.com` (tanpa port). Sistem menolak
> kombinasi ini saat validasi dan otomatis membuang portnya saat menyusun
> URL media.

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
   Untuk rule berplatform Facebook, tambahkan juga akun Facebook beserta
   cookies. Sistem memilih akun pemantau otomatis sesuai platform rule.
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
| `ERR_SSL_PROTOCOL_ERROR` pada URL media | `PUBLIC_BASE_URL` memakai https + port aplikasi (mis. `:4000`). Hapus portnya — TLS ada di 443 lewat Traefik |
| Menu baru tidak muncul di sidebar | Logout–login ulang; permission disimpan di sesi saat login |
| Scrape gagal / akun terputus | Cookies akun pemantau kedaluwarsa — perbarui lewat menu Account |
| Backend/DB tiba-tiba mati, log Postgres `No space left on device` | Disk penuh — lihat [Pemeliharaan disk](#pemeliharaan-disk) |

---

## Pemeliharaan disk

**Disk penuh = database mati.** Postgres yang tidak bisa menulis checkpoint
akan PANIC, restart, lalu PANIC lagi — masuk crash-loop dan menolak semua
koneksi dengan status `recovery mode`. Aplikasi ikut mati total.

Ini bukan skenario hipotetis: penyumbang terbesarnya biasanya **build cache
Docker**, yang menggembung beberapa GB hanya dari beberapa kali
`./deploy.sh` karena tiap build menyimpan layer perantara.

Di VPS ini risikonya lebih tinggi daripada di lokal, sebab volume
`app_uploads` juga bertambah setiap hari dari media hasil scrape.

### Pantau rutin

```bash
df -h /                 # disk host — usahakan minimal 20% bebas
docker system df        # rincian: images, containers, volumes, build cache
```

Kalau `Use%` sudah di atas 80%, bersihkan sebelum jadi masalah.

### Pembersihan aman

```bash
docker builder prune -af    # build cache — paling besar, paling aman
docker image prune -af      # image tak terpakai container manapun
```

Keduanya **tidak menyentuh volume data**. Aman dijalankan kapan saja,
termasuk saat aplikasi sedang berjalan.

### ⛔ Jangan dijalankan

```bash
docker system prune -a --volumes    # JANGAN — ikut menghapus volume data
docker compose down -v              # JANGAN — hapus postgres_data & app_uploads
```

Kedua perintah di atas menghapus **database dan seluruh media** secara
permanen. `docker compose down` tanpa `-v` aman.

### Otomatisasi (opsional)

Bersihkan build cache tiap minggu lewat cron:

```bash
crontab -e
# Setiap Minggu 03:00 — bersihkan cache build yang lebih tua dari 7 hari
0 3 * * 0 /usr/bin/docker builder prune -af --filter until=168h > /dev/null 2>&1
```

### Pemulihan bila terlanjur penuh

```bash
docker builder prune -af                                  # 1. bebaskan ruang
docker image prune -af
df -h /                                                   # 2. pastikan ada ruang bebas
docker compose -f docker-compose.yml restart postgres     # 3. pulihkan DB
docker compose -f docker-compose.yml exec -T postgres pg_isready -U postgres
```

Postgres umumnya pulih sendiri lewat WAL recovery begitu ruang disk
tersedia — data tidak hilang. Verifikasi setelahnya:

```bash
docker compose -f docker-compose.yml exec -T postgres \
  psql -U postgres -d ternak_sosmed -c "select count(*) from accounts;"
```

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
