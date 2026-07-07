#!/usr/bin/env bash
# Deploy ternak-sosmed ke VPS manual (tanpa Dokploy) — one-click, urutan eksplisit.
# Jalankan dari root repo: ./deploy.sh
#
# Prasyarat sekali di awal (sebelum run ini):
#   - Docker sudah terinstall
#   - DNS BACKEND_DOMAIN & FRONTEND_DOMAIN (di .env) sudah A-record ke IP VPS ini
#   - Port 80 & 443 terbuka di firewall
#   - traefik-manual/docker-compose.traefik.yml sudah dijalankan (lihat langkah 2 di bawah)
#
# CATATAN: network eksternal "ternak-sosmed-network" dipakai BERSAMA oleh
# Traefik (traefik-manual/docker-compose.traefik.yml) dan app ini
# (docker-compose.yml). Kalau ada project LAIN di VPS yang sama yang juga
# pakai Traefik ini, pastikan --providers.docker.network di config Traefik
# tidak di-restrict ke network project lain — cek dengan:
#   docker inspect <traefik-container> --format '{{json .Config.Cmd}}'
# JANGAN pernah `docker compose down` network ini dari project lain manapun.

set -euo pipefail
cd "$(dirname "$0")"

COMPOSE="docker compose -f docker-compose.yml"
APP_NETWORK="ternak-sosmed-network"

echo "==> 1. Memastikan .env ada"
if [ ! -f .env ]; then
  echo "    File .env tidak ditemukan. Copy dari .env.example dan isi nilai asli:"
  echo "      cp .env.example .env && nano .env"
  exit 1
fi
echo "    .env ditemukan."

# Baca DB_NAME dari .env untuk dipakai step wait-for-postgres di bawah.
# shellcheck disable=SC1091
set -a; source .env; set +a
DB_NAME="${DB_NAME:-ternak_sosmed}"
DB_USERNAME="${DB_USERNAME:-postgres}"

echo "==> 2. Memastikan network eksternal ${APP_NETWORK} ada"
if ! docker network inspect "$APP_NETWORK" >/dev/null 2>&1; then
  echo "    Network ${APP_NETWORK} belum ada, membuat..."
  docker network create "$APP_NETWORK"
else
  echo "    Network $APP_NETWORK ditemukan."
fi

echo "==> 3. Pull perubahan terbaru dari git (skip kalau bukan git repo)"
if [ -d .git ]; then
  git pull --ff-only || echo "    git pull gagal/di-skip, lanjut pakai kode lokal yang ada."
fi

echo "==> 4. Start postgres & redis dulu (tanpa backend/frontend)"
$COMPOSE up -d postgres redis

echo "==> 5. Menunggu postgres benar-benar sehat (healthcheck)..."
for i in $(seq 1 30); do
  status="$($COMPOSE ps postgres --format '{{.Health}}' 2>/dev/null || true)"
  if [ "$status" = "healthy" ]; then
    echo "    Postgres healthy."
    break
  fi
  if [ "$i" -eq 30 ]; then
    echo "    ERROR: postgres tidak kunjung healthy setelah 60 detik."
    $COMPOSE logs postgres --tail 50
    exit 1
  fi
  sleep 2
done

echo "==> 6. Menunggu database '$DB_NAME' benar-benar bisa dikoneksi (bukan cuma server hidup)..."
for i in $(seq 1 30); do
  if $COMPOSE exec -T postgres psql -U "$DB_USERNAME" -d "$DB_NAME" -c "SELECT 1;" >/dev/null 2>&1; then
    echo "    Database '$DB_NAME' siap menerima koneksi."
    break
  fi
  if [ "$i" -eq 30 ]; then
    echo "    ERROR: database '$DB_NAME' tidak bisa dikoneksi setelah 60 detik."
    echo "    Isi .env sekarang untuk DB_NAME:"
    grep -n "^DB_NAME=" .env || echo "    (tidak ditemukan, memakai default ternak_sosmed)"
    echo "    Database yang ada di Postgres:"
    $COMPOSE exec -T postgres psql -U "$DB_USERNAME" -c "\l" || true
    exit 1
  fi
  sleep 2
done

echo "==> 7. Build & jalankan backend (migration otomatis jalan di entrypoint)"
$COMPOSE up -d --build backend

echo "==> 8. Menunggu backend benar-benar Up (bukan restarting)..."
for i in $(seq 1 30); do
  status="$($COMPOSE ps backend --format '{{.Status}}' 2>/dev/null || true)"
  if echo "$status" | grep -qi "^up"; then
    echo "    Backend up."
    break
  fi
  if [ "$i" -eq 30 ]; then
    echo "    ERROR: backend tidak kunjung Up setelah 60 detik (kemungkinan crash-loop)."
    echo "    Log backend:"
    $COMPOSE logs backend --tail 80
    exit 1
  fi
  sleep 2
done

echo "==> 9. Build & jalankan frontend"
$COMPOSE up -d --build frontend

echo "==> 10. Status akhir"
$COMPOSE ps

echo ""
echo "Selesai. Cek log kalau ada yang gak beres:"
echo "  $COMPOSE logs backend --tail 50"
echo "  $COMPOSE logs frontend --tail 50"
echo ""
echo "Kalau ini deploy pertama kali, jalankan seeder untuk buat akun default:"
echo "  $COMPOSE exec backend npm run seeder:prod"
