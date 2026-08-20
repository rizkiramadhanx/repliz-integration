#!/usr/bin/env bash
# Menghapus berkas media yang sudah TIDAK dirujuk jadwal Repliz mana pun
# ("yatim"). Menghapus jadwal di Repliz tidak ikut menghapus berkasnya, jadi
# volume app_uploads terus bertumbuh sampai disk penuh — dan disk penuh
# membuat Postgres PANIC (lihat docs/DEPLOY.md).
#
# Jalankan dari root repo di VPS:
#   ./scripts/bersihkan-media-yatim.sh            # hanya menampilkan (dry-run)
#   ./scripts/bersihkan-media-yatim.sh --hapus    # benar-benar menghapus
#
# Aman secara bawaan: tanpa --hapus tidak ada berkas yang disentuh.

if [ -z "${BASH_VERSION:-}" ]; then
  if command -v bash >/dev/null 2>&1; then exec bash "$0" "$@"; fi
  echo "ERROR: script ini butuh bash." >&2
  exit 1
fi

set -euo pipefail
cd "$(dirname "$0")/.."

COMPOSE="docker compose -f docker-compose.yml"
MEDIA_DIR="/usr/src/app/uploads/repliz-media"
DO_DELETE=0

for arg in "$@"; do
  case "$arg" in
    --hapus|--delete) DO_DELETE=1 ;;
    -h|--help) sed -n '2,12p' "$0" | sed 's/^# \{0,1\}//'; exit 0 ;;
    *) echo "Opsi tidak dikenal: $arg" >&2; exit 1 ;;
  esac
done

fail() { echo ""; echo "GAGAL: $*" >&2; exit 1; }

env_get() {
  local key="$1" line value
  line="$(grep -E "^[[:space:]]*${key}=" .env | tail -n 1 || true)"
  [ -n "$line" ] || return 0
  value="${line#*=}"
  value="${value%\"}"; value="${value#\"}"
  value="${value%\'}"; value="${value#\'}"
  printf '%s' "$value"
}

[ -f .env ] || fail "File .env tidak ditemukan."

ACCESS_KEY="$(env_get REPLIZ_ACCESS_KEY)"
SECRET_KEY="$(env_get REPLIZ_SECRET_KEY)"
[ -n "$ACCESS_KEY" ] && [ -n "$SECRET_KEY" ] \
  || fail "REPLIZ_ACCESS_KEY / REPLIZ_SECRET_KEY belum diisi di .env."

AUTH="$(printf '%s' "${ACCESS_KEY}:${SECRET_KEY}" | base64 | tr -d '\n')"

echo "==> 1. Membaca jadwal aktif dari Repliz"
: > /tmp/media-dipakai.txt

# Dibaca berhalaman: satu halaman hanya memuat 200 jadwal, dan melewatkan
# halaman berikutnya akan membuat berkas yang MASIH dipakai ikut terhapus.
page=1
while [ "$page" -le 50 ]; do
  body="$(curl -fsS "https://api.repliz.com/public/schedule?page=${page}&limit=200" \
    -H "Authorization: Basic ${AUTH}" --max-time 60)" \
    || fail "tidak bisa membaca jadwal Repliz (halaman ${page})."

  printf '%s' "$body" | python3 -c '
import json, re, sys
data = json.load(sys.stdin, strict=False)
names = []
for item in data.get("docs", []):
    for media in item.get("medias") or []:
        hit = re.search(r"/repliz-media/([^/?#]+)", media.get("url") or "")
        if hit:
            names.append(hit.group(1))
print("\n".join(names))
print("HASNEXT=" + str(bool(data.get("hasNextPage"))), file=sys.stderr)
' >> /tmp/media-dipakai.txt 2>/tmp/media-next.txt

  grep -q "HASNEXT=True" /tmp/media-next.txt || break
  page=$((page + 1))
done

sort -u /tmp/media-dipakai.txt | grep -v '^$' > /tmp/media-dipakai-uniq.txt || true
USED_COUNT="$(wc -l < /tmp/media-dipakai-uniq.txt | tr -d ' ')"
echo "    ${USED_COUNT} berkas masih dirujuk jadwal aktif."

# Nol berkas terpakai hampir selalu berarti pembacaan gagal, bukan bahwa
# semua jadwal benar-benar tanpa media. Menghapus berdasarkan daftar kosong
# akan menghapus SELURUH media, jadi dihentikan di sini.
[ "$USED_COUNT" -gt 0 ] || fail "Daftar berkas terpakai kosong — dihentikan demi keamanan.
      Periksa kredensial Repliz dan koneksi, lalu ulangi."

echo "==> 2. Membandingkan dengan isi volume"
$COMPOSE exec -T backend sh -c "ls -1 ${MEDIA_DIR} 2>/dev/null || true" \
  | tr -d '\r' | grep -v '^$' > /tmp/media-ada.txt || true

TOTAL="$(wc -l < /tmp/media-ada.txt | tr -d ' ')"
comm -23 <(sort -u /tmp/media-ada.txt) /tmp/media-dipakai-uniq.txt > /tmp/media-yatim.txt || true
ORPHAN="$(wc -l < /tmp/media-yatim.txt | tr -d ' ')"

echo "    berkas di volume : ${TOTAL}"
echo "    masih dipakai    : $((TOTAL - ORPHAN))"
echo "    yatim (bisa hapus): ${ORPHAN}"

if [ "$ORPHAN" -eq 0 ]; then
  echo ""
  echo "Tidak ada berkas yatim. Selesai."
  exit 0
fi

echo ""
echo "Contoh berkas yatim:"
head -5 /tmp/media-yatim.txt | sed 's/^/    /'

if [ "$DO_DELETE" -eq 0 ]; then
  echo ""
  echo "Ini mode tampil saja — tidak ada yang dihapus."
  echo "Untuk benar-benar menghapus, jalankan lagi dengan --hapus"
  exit 0
fi

echo ""
echo "==> 3. Menghapus ${ORPHAN} berkas yatim"
$COMPOSE exec -T backend sh -c "cd ${MEDIA_DIR} && xargs -r rm -f" \
  < /tmp/media-yatim.txt

SISA="$($COMPOSE exec -T backend sh -c "ls -1 ${MEDIA_DIR} 2>/dev/null | wc -l" | tr -d ' \r')"
echo "    selesai. Berkas tersisa di volume: ${SISA}"
