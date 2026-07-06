#!/usr/bin/env bash
# Deploy ternak-sosmed ke VPS manual (tanpa Dokploy).
# Jalankan dari root repo: ./deploy.sh
#
# Prasyarat sekali di awal (sebelum run ini):
#   - Docker sudah terinstall
#   - DNS BACKEND_DOMAIN & FRONTEND_DOMAIN (di .env) sudah A-record ke IP VPS ini
#   - Port 80 & 443 terbuka di firewall
#   - traefik-manual/docker-compose.traefik.yml sudah dijalankan (lihat langkah 2 di bawah)

set -euo pipefail
cd "$(dirname "$0")"

NETWORK_NAME="ternak-sosmed-network"

echo "==> 1. Memastikan network ${NETWORK_NAME} ada"
if ! docker network inspect "$NETWORK_NAME" >/dev/null 2>&1; then
  docker network create "$NETWORK_NAME"
  echo "    Network ${NETWORK_NAME} dibuat."
else
  echo "    Network ${NETWORK_NAME} sudah ada, skip."
fi

echo "==> 2. Memastikan Traefik jalan"
if ! docker ps --format '{{.Names}}' | grep -q '^traefik-manual-traefik-1$\|^traefik$'; then
  echo "    Traefik belum terdeteksi jalan."
  echo "    Jalankan dulu manual:"
  echo "      cd traefik-manual && ACME_EMAIL=you@example.com docker compose -f docker-compose.traefik.yml up -d"
  echo "    Lalu jalankan ulang script ini."
  exit 1
fi
echo "    Traefik terdeteksi jalan."

echo "==> 3. Memastikan .env ada"
if [ ! -f .env ]; then
  echo "    File .env tidak ditemukan. Copy dari .env.example dan isi nilai asli:"
  echo "      cp .env.example .env && nano .env"
  exit 1
fi
echo "    .env ditemukan."

echo "==> 4. Pull perubahan terbaru dari git (skip kalau bukan git repo / tidak diinginkan)"
if [ -d .git ]; then
  git pull --ff-only || echo "    git pull gagal/di-skip, lanjut pakai kode lokal yang ada."
fi

# PENTING: pakai -f docker-compose.yml secara eksplisit. Development pakai file
# terpisah (docker-compose.dev.yml, network default/local) — jangan sampai
# tercampur di produksi, karena network jadi beda dari yang dipakai Traefik dan
# routing gagal total (404).
COMPOSE="docker compose -f docker-compose.yml"

echo "==> 5. Build & jalankan semua service"
$COMPOSE up -d --build

echo "==> 6. Menunggu backend jadi healthy..."
for i in $(seq 1 30); do
  status="$($COMPOSE ps backend --format '{{.Status}}' 2>/dev/null || true)"
  if echo "$status" | grep -qi "up"; then
    echo "    Backend up."
    break
  fi
  sleep 2
done

echo "==> 7. Status akhir"
$COMPOSE ps

echo ""
echo "Selesai. Cek log kalau ada yang gak beres:"
echo "  $COMPOSE logs backend --tail 50"
echo "  $COMPOSE logs frontend --tail 50"
