# Boilerplate NestJS React

Boilerplate fullstack: backend NestJS + TypeORM (`backend/`) dan frontend React + Vite + Mantine (`frontend/`), dideploy sebagai container Docker di belakang Traefik (reverse proxy + TLS otomatis Let's Encrypt).

## Struktur

```
.
├── backend/                          # NestJS + TypeORM
├── frontend/                         # React + Vite + Mantine
├── traefik-manual/                   # Traefik (reverse proxy + TLS), dijalankan terpisah
├── docker-compose.yml                # Production — postgres + backend + frontend, Traefik labels
├── docker-compose.dev.yml            # Development — semua service + hot-reload, tanpa Traefik
├── deploy.sh                         # Script deploy production ke VPS
└── .env.example                      # Template environment production
```

---

## Development

Semua service (Postgres, backend, frontend) jalan sebagai container dengan hot-reload — tidak perlu Node.js/npm terinstall di host.

```bash
docker compose -f docker-compose.dev.yml up --build
```

- Frontend: http://localhost:5173
- Backend API: http://localhost:4000
- Postgres: `localhost:5432` (user/pass/db: `postgres`/`postgres`/`ternak_sosmed`)

Source code di-mount langsung ke container (`./backend` dan `./frontend`), jadi perubahan kode langsung ke-reload (NestJS `--watch`, Vite dev server). Tidak butuh `.env` — semua value dev sudah di-hardcode di `docker-compose.dev.yml`.

Hentikan dengan `Ctrl+C`, atau `docker compose -f docker-compose.dev.yml down` (tambahkan `-v` untuk sekalian hapus data Postgres).

### Setup awal database (sekali, setelah container pertama kali up)

Volume Postgres dev dimulai kosong — jalankan migration dan seeder di dalam container backend:

```bash
docker compose -f docker-compose.dev.yml exec backend npm run migration:run
docker compose -f docker-compose.dev.yml exec backend npm run seeder
```

Seeder membuat role dan user default:

| Email | Password | Role |
|---|---|---|
| `admin@example.com` | `Admin123!` | Admin |
| `operator@example.com` | `Operator123!` | Operator |

---

## Production (VPS, Docker Compose + Traefik)

### Prasyarat (sekali di awal)

- Docker & Docker Compose terinstall di VPS
- DNS `BACKEND_DOMAIN` dan `FRONTEND_DOMAIN` (akan diisi di `.env`) sudah A-record ke IP VPS
- Port 80 & 443 terbuka di firewall

### 1. Jalankan Traefik (sekali saja, terpisah dari app)

Traefik berjalan sebagai stack terpisah supaya tidak perlu di-restart tiap deploy app.

```bash
cd traefik-manual
ACME_EMAIL=you@example.com docker compose -f docker-compose.traefik.yml up -d
cd ..
```

Ganti `you@example.com` dengan email asli — dipakai Let's Encrypt untuk notifikasi sertifikat.

### 2. Setup environment

```bash
cp .env.example .env
nano .env
```

Isi minimal:

| Variabel | Keterangan |
|---|---|
| `BACKEND_DOMAIN` | Domain API, mis. `api.example.com` |
| `FRONTEND_DOMAIN` | Domain frontend, mis. `app.example.com` |
| `DB_USERNAME`, `DB_PASSWORD`, `DB_NAME` | Kredensial Postgres |
| `JWT_SECRET`, `JWT_SECRET_REFRESH` | String acak panjang — **wajib diisi**, compose akan gagal start kalau kosong |
| `MAIL_*` | Opsional, untuk fitur email |

### 3. Deploy

```bash
./deploy.sh
```

Script ini otomatis:
1. Membuat Docker network `ternak-sosmed-network` kalau belum ada
2. Mengecek Traefik sudah jalan (exit dengan pesan kalau belum)
3. Mengecek `.env` ada (exit dengan pesan kalau belum)
4. `git pull --ff-only` (kalau direktori ini git repo)
5. `docker compose -f docker-compose.yml up -d --build`
6. Menunggu backend healthy, lalu menampilkan status akhir

### 4. Migration database (setelah deploy pertama / ada migration baru)

```bash
docker compose -f docker-compose.yml exec backend npm run migration:run
```

### 5. Verifikasi

```bash
curl -I https://<FRONTEND_DOMAIN>
curl -I https://<BACKEND_DOMAIN>/health
```

### Update / redeploy

Cukup jalankan lagi:

```bash
./deploy.sh
```

### Rollback

```bash
git reset --hard <commit_hash_aman>
docker compose -f docker-compose.yml up -d --build
docker compose -f docker-compose.yml exec backend npm run migration:revert   # kalau perlu
```

### Log & troubleshooting

```bash
docker compose -f docker-compose.yml ps
docker compose -f docker-compose.yml logs -f backend
docker compose -f docker-compose.yml logs -f frontend
docker logs -f traefik-manual-traefik-1   # log Traefik (routing, TLS)
```

---

## Cara kerja Traefik di setup ini

- Traefik adalah **satu-satunya entry point publik** (port 80/443). Backend dan frontend **tidak** mem-publish port ke host — hanya terhubung lewat Docker network `ternak-sosmed-network`.
- Routing ditentukan lewat **Docker labels** di `docker-compose.yml` (`traefik.http.routers.*.rule=Host(...)`), bukan file config nginx manual.
- TLS otomatis via Let's Encrypt (HTTP challenge) — sertifikat disimpan di volume `traefik_letsencrypt`, auto-renewal tanpa cron/certbot manual.
- nginx di dalam container `frontend` **tetap ada**, tapi perannya cuma serve static file hasil build React (`frontend/Dockerfile`) — bukan reverse proxy.
