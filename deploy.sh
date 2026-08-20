#!/usr/bin/env bash
# Deploy ternak-sosmed ke VPS manual (tanpa Dokploy) — one-click, urutan eksplisit.
# Jalankan dari root repo: ./deploy.sh
#
# Prasyarat sekali di awal (sebelum run ini):
#   - Docker sudah terinstall
#   - DNS BACKEND_DOMAIN & FRONTEND_DOMAIN (di .env) sudah A-record ke IP VPS ini
#   - Port 80 & 443 terbuka di firewall
#   - traefik-manual/docker-compose.traefik.yml sudah dijalankan (dicek otomatis
#     di langkah 3 di bawah)
#
# Opsi:
#   --skip-pull    jangan `git pull`, deploy kode lokal apa adanya
#   --seed         jalankan seeder setelah backend Up (aman diulang; seeder
#                  memperbarui role dan melewati user yang sudah ada)
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

SKIP_PULL=0
RUN_SEED=0
for arg in "$@"; do
  case "$arg" in
    --skip-pull) SKIP_PULL=1 ;;
    --seed) RUN_SEED=1 ;;
    -h|--help)
      sed -n '2,25p' "$0" | sed 's/^# \{0,1\}//'
      exit 0
      ;;
    *)
      echo "Opsi tidak dikenal: $arg (pakai --help)" >&2
      exit 1
      ;;
  esac
done

fail() {
  echo ""
  echo "GAGAL: $*" >&2
  exit 1
}

# Membaca satu nilai dari .env TANPA menjalankan isinya sebagai shell.
# `source .env` berbahaya di sini: nilai berisi spasi, tanda kutip, `$`,
# atau backtick akan dieksekusi shell — password seperti `p@ss w0rd!` jadi
# kosong dan backtick bisa menjalankan perintah. Karena itu diparse manual.
env_get() {
  local key="$1" default="${2:-}" line value
  line="$(grep -E "^[[:space:]]*${key}=" .env | tail -n 1 || true)"
  if [ -z "$line" ]; then
    printf '%s' "$default"
    return
  fi
  value="${line#*=}"
  # Buang kutip pembungkus bila ada.
  value="${value%\"}"; value="${value#\"}"
  value="${value%\'}"; value="${value#\'}"
  if [ -z "$value" ]; then
    printf '%s' "$default"
  else
    printf '%s' "$value"
  fi
}

echo "==> 1. Memastikan .env ada"
[ -f .env ] || fail "File .env tidak ditemukan. Copy dari .env.example dan isi nilai asli:
      cp .env.example .env && nano .env"
echo "    .env ditemukan."

DB_NAME="$(env_get DB_NAME ternak_sosmed)"
DB_USERNAME="$(env_get DB_USERNAME postgres)"

echo "==> 2. Memeriksa variabel wajib di .env"
# docker compose akan gagal dengan pesan samar kalau ini kosong; dicek lebih
# awal supaya sebabnya jelas sebelum apa pun dibangun.
MISSING=()
for key in BACKEND_DOMAIN FRONTEND_DOMAIN JWT_SECRET JWT_SECRET_REFRESH; do
  [ -n "$(env_get "$key")" ] || MISSING+=("$key")
done
if [ ${#MISSING[@]} -gt 0 ]; then
  fail "Variabel wajib berikut kosong di .env: ${MISSING[*]}
      Generate secret yang kuat dengan: openssl rand -base64 48"
fi
echo "    Variabel wajib terisi."

# PUBLIC_BASE_URL memakai https + port aplikasi adalah kesalahan yang tidak
# terlihat sampai Repliz gagal mengunduh media (ERR_SSL_PROTOCOL_ERROR):
# TLS diterminasi Traefik di 443, sedangkan port aplikasi melayani HTTP polos.
PUBLIC_BASE_URL="$(env_get PUBLIC_BASE_URL)"
if [ -n "$PUBLIC_BASE_URL" ]; then
  case "$PUBLIC_BASE_URL" in
    https://*:[0-9]*)
      case "$PUBLIC_BASE_URL" in
        https://*:443|https://*:443/*) ;;
        *) fail "PUBLIC_BASE_URL ($PUBLIC_BASE_URL) memakai https dengan port aplikasi.
      TLS ada di port 443 lewat Traefik — hapus portnya, cukup https://<domain>." ;;
      esac
      ;;
    *localhost*|*127.0.0.1*)
      fail "PUBLIC_BASE_URL ($PUBLIC_BASE_URL) mengarah ke localhost.
      Server Repliz yang mengunduh media, jadi URL harus bisa diakses dari internet." ;;
  esac
fi

echo "==> 3. Memastikan network ${APP_NETWORK} dan Traefik siap"
if ! docker network inspect "$APP_NETWORK" >/dev/null 2>&1; then
  echo "    Network ${APP_NETWORK} belum ada, membuat..."
  docker network create "$APP_NETWORK"
else
  echo "    Network $APP_NETWORK ditemukan."
fi

# Tanpa Traefik, container tetap Up tapi domainnya tidak bisa diakses sama
# sekali — deploy terlihat "sukses" padahal situsnya mati. Diperingatkan di
# sini, bukan dijadikan error, supaya deploy tetap bisa dilanjutkan saat
# Traefik sengaja dikelola terpisah.
if docker ps --filter "name=traefik" --format '{{.Names}}' | grep -q .; then
  echo "    Traefik terdeteksi berjalan."
else
  echo "    PERINGATAN: tidak ada container Traefik yang berjalan."
  echo "    Domain tidak akan bisa diakses sampai Traefik dijalankan:"
  echo "      cd traefik-manual && ACME_EMAIL=kamu@domain.com docker compose -f docker-compose.traefik.yml up -d"
fi

echo "==> 4. Pull perubahan terbaru dari git"
if [ "$SKIP_PULL" -eq 1 ]; then
  echo "    Dilewati (--skip-pull)."
elif [ -d .git ]; then
  git pull --ff-only || echo "    git pull gagal/di-skip, lanjut pakai kode lokal yang ada."
else
  echo "    Bukan git repo, dilewati."
fi

echo "==> 5. Start postgres & redis dulu (tanpa backend/frontend)"
$COMPOSE up -d postgres redis

echo "==> 6. Menunggu postgres benar-benar sehat (healthcheck)..."
for i in $(seq 1 30); do
  status="$($COMPOSE ps postgres --format '{{.Health}}' 2>/dev/null || true)"
  if [ "$status" = "healthy" ]; then
    echo "    Postgres healthy."
    break
  fi
  if [ "$i" -eq 30 ]; then
    $COMPOSE logs postgres --tail 50
    fail "postgres tidak kunjung healthy setelah 60 detik."
  fi
  sleep 2
done

echo "==> 7. Menunggu database '$DB_NAME' benar-benar bisa dikoneksi (bukan cuma server hidup)..."
for i in $(seq 1 30); do
  if $COMPOSE exec -T postgres psql -U "$DB_USERNAME" -d "$DB_NAME" -c "SELECT 1;" >/dev/null 2>&1; then
    echo "    Database '$DB_NAME' siap menerima koneksi."
    break
  fi
  if [ "$i" -eq 30 ]; then
    echo "    Isi .env sekarang untuk DB_NAME:"
    grep -n "^DB_NAME=" .env || echo "    (tidak ditemukan, memakai default ternak_sosmed)"
    echo "    Database yang ada di Postgres:"
    $COMPOSE exec -T postgres psql -U "$DB_USERNAME" -c "\l" || true
    fail "database '$DB_NAME' tidak bisa dikoneksi setelah 60 detik."
  fi
  sleep 2
done

echo "==> 8. Build & jalankan backend (migration otomatis jalan di entrypoint)"
$COMPOSE up -d --build backend

echo "==> 9. Menunggu backend benar-benar Up (bukan restarting)..."
for i in $(seq 1 45); do
  status="$($COMPOSE ps backend --format '{{.Status}}' 2>/dev/null || true)"
  # Container yang crash-loop juga sempat berstatus "Up" sesaat setelah
  # restart, jadi "Restarting" dicek lebih dulu agar tidak lolos.
  if echo "$status" | grep -qi "restarting"; then
    :
  elif echo "$status" | grep -qi "^up"; then
    echo "    Backend up."
    break
  fi
  if [ "$i" -eq 45 ]; then
    echo "    Log backend:"
    $COMPOSE logs backend --tail 80
    fail "backend tidak kunjung Up setelah 90 detik (kemungkinan crash-loop atau migration gagal)."
  fi
  sleep 2
done

# Migration dijalankan entrypoint sebelum server start. Kalau gagal, container
# akan exit — jadi kegagalannya sudah tertangkap di langkah 9. Di sini status
# migration ditampilkan sebagai informasi, tidak menggagalkan deploy.
echo "==> 10. Status migration"
$COMPOSE exec -T backend node node_modules/typeorm/cli.js migration:show \
  -d dist/config/typeorm.config.js 2>/dev/null | tail -20 \
  || echo "    (tidak bisa dibaca, lewati)"

echo "==> 11. Build & jalankan frontend"
$COMPOSE up -d --build frontend

if [ "$RUN_SEED" -eq 1 ]; then
  echo "==> 12. Menjalankan seeder"
  $COMPOSE exec -T backend npm run seeder:prod
fi

echo "==> Status akhir"
$COMPOSE ps

# Disk penuh membuat Postgres PANIC dan masuk crash-loop; build cache Docker
# adalah penyebab tersering karena menggembung tiap kali deploy.
DISK_USED="$(df -P / | awk 'NR==2 {gsub(/%/,"",$5); print $5}')"
if [ -n "${DISK_USED:-}" ] && [ "$DISK_USED" -ge 80 ]; then
  echo ""
  echo "PERINGATAN: disk terpakai ${DISK_USED}%. Bersihkan sebelum jadi masalah:"
  echo "  docker builder prune -af && docker image prune -af"
  echo "  (JANGAN pakai --volumes: itu menghapus database & media)"
fi

echo ""
echo "Selesai. Cek log kalau ada yang gak beres:"
echo "  $COMPOSE logs backend --tail 50"
echo "  $COMPOSE logs frontend --tail 50"

if [ "$RUN_SEED" -eq 0 ]; then
  echo ""
  echo "Kalau ini deploy pertama kali, jalankan seeder untuk buat akun default:"
  echo "  $COMPOSE exec backend npm run seeder:prod"
  echo "  (atau deploy ulang dengan: ./deploy.sh --seed)"
fi
