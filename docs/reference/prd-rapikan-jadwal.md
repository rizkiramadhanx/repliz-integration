# PRD — Rapikan Jadwal (Schedule Remap)

> **Status:** RENCANA — belum diimplementasikan sebagai fitur. Perapian pertama (26 Agustus 2026, 1473 jadwal) dijalankan lewat skrip sekali pakai; dokumen ini menetapkan bentuk permanennya di dashboard.

---

## 1. Masalah

Jadwal impor dibuat berurutan dari jam mulai dengan jeda tetap. Sampai commit `796a843`, penghitung slot dipotong di tengah malam: jumlah slot per hari dihitung dari sisa waktu menuju 00:00, lalu sisanya dilempar ke hari berikutnya pada jam yang sama.

Akibatnya jam mulai yang larut menghasilkan jadwal sangat renggang. Mulai 21:30 dengan jeda 1 jam hanya memberi 3 konten per hari (21:30, 22:30, 23:30) — 547 konten butuh 166 hari, padahal dengan 24 slot per hari cukup 23 hari.

Perbaikan di `796a843` menghentikan masalah untuk impor **baru**. Jadwal yang terlanjur dibuat tetap renggang, dan tidak ada cara memperbaikinya dari dashboard: satu-satunya jalan adalah menghapus lalu mengimpor ulang — yang berarti mengunduh ulang seluruh media.

Kondisi nyata saat ditemukan (26 Agustus 2026, 5 akun Instagram, 1492 jadwal pending):

| Akun | Jadwal | Sebaran sebelum | Sesudah |
|---|---|---|---|
| Natasha Maharani | 573 | 3/hari di sebagian tanggal, 166 hari | 24/hari, 25 hari |
| Salman Alfarisi | 489 | jam dobel (14:55 ×2), 70 hari | 24/hari, 19 hari |
| Salsa Mitarika | 229 | 4/hari, 58 hari | 24/hari, 11 hari |
| Ricaa Amalia | 208 | sisipan 13:39/13:44/13:49 | 24/hari, 10 hari |
| Putri Salmaa | 106 | — | 24/hari |

Selain lubang jadwal, terlihat dua cacat lain yang perlu ikut ditangani: **jam duplikat** (dua konten pada menit yang sama) dan **sisipan tak beraturan** dari impor yang tumpang tindih.

## 2. Tujuan

Menyediakan cara aman dan berulang untuk menyusun ulang seluruh jadwal `pending` sebuah akun menjadi deret rapat: mulai dari satu titik waktu, berjarak tetap, tanpa lubang dan tanpa tabrakan.

**Bukan tujuan:** mengubah isi konten (caption, media, tipe), menyentuh jadwal berstatus `success`/`failed`, atau mengatur ulang urutan konten. Urutan relatif dipertahankan — yang berubah hanya waktunya.

## 3. Pengguna & Pemicu

Operator dashboard, pada tiga keadaan:

1. Setelah impor yang memakai logika lama meninggalkan jadwal renggang.
2. Setelah beberapa batch impor berjalan bersamaan dan saling menyisipkan jam.
3. Ketika ingin memampatkan antrean panjang agar konten habis lebih cepat.

## 4. Alur

```
Dashboard → Impor URL → panel "Rapikan Jadwal"

  Akun          : [Natasha Maharani ▾]   (hanya akun dengan jadwal pending)
  Mulai dari    : ( ) Sekarang  (•) 2026-08-27 06:00
  Jeda          : [ 60 ] menit
  Maksimal/hari : [ 24 ]

  [Lihat rencana]

  ── Rencana ─────────────────────────────────
  573 jadwal pending akan disusun ulang:
    27 Agt 06:00 → 18 Sep 10:00  (24/hari, 25 hari)
    541 berubah, 32 sudah pada tempatnya
  Contoh 5 perubahan pertama:
    27 Agt 14:30 → 27 Agt 06:00
    27 Agt 14:30 → 27 Agt 07:00
    ...
  [Terapkan]  [Batal]
```

Dua langkah wajib: **Lihat rencana** menampilkan hasil tanpa mengirim apa pun, **Terapkan** baru mengirim. Perapian menyentuh ratusan jadwal sekaligus dan tidak punya tombol undo, jadi pratinjau bukan kemewahan.

## 5. Aturan Perhitungan

Jadwal pending akun diurutkan menaik berdasarkan `scheduleAt`, lalu slot ke-`i` menjadi:

```
waktu[i] = mulai + (i × jeda)
```

Tanpa pemotongan di tengah malam — itulah cacat yang diperbaiki. Bila `maksimal per hari` diisi dan lebih kecil dari `1440 / jeda`, deret berpindah ke pukul `mulai` hari berikutnya setelah kuota harian habis.

Ketentuan lain:

- **Urutan dipertahankan.** Konten yang lebih dulu dijadwalkan tetap lebih dulu terbit.
- **Titik mulai di masa lalu ditolak.** Repliz menerima `scheduleAt` lampau tanpa keluhan, tetapi konten bisa langsung terbit serentak.
- **Hanya status `pending`.** Yang sudah `success` tidak boleh disentuh; yang `failed` diabaikan karena tidak akan terbit.
- **Hanya jadwal yang benar-benar berubah dikirim.** Pada perapian pertama, 19 dari 1492 jadwal sudah tepat dan dilewati.

## 6. Kontrak API Repliz

`PUT /public/schedule/{scheduleId}` — memerlukan tier **Premium+**.

Seluruh field wajib dikirim ulang; endpoint ini mengganti isi, bukan menambal. Mengirim hanya `scheduleAt` akan mengosongkan caption dan media. Karena itu jadwal harus dibaca lebih dulu, lalu dikirim balik utuh dengan hanya `scheduleAt` yang diubah:

```json
{
  "title": "", "description": "…", "topic": "",
  "type": "video", "medias": [...], "meta": {},
  "additionalInfo": {...}, "replies": [],
  "scheduleAt": "2026-08-27T06:00:00.000Z"
}
```

Respons sukses: **204 No Content** (tanpa body). Diverifikasi pada 26 Agustus 2026: `scheduleAt` berubah sementara `type`, `status`, `accountId`, dan `medias` tetap utuh.

Waktu selalu UTC. WIB = UTC+7 — pukul 06:00 UTC berarti 13:00 WIB.

## 7. Perilaku Non-Fungsional

- **Jeda antar permintaan.** Perapian pertama memakai 120 ms (1473 permintaan ≈ 4 menit) tanpa penolakan. Tanpa jeda, risiko rate limit.
- **Kegagalan sebagian tidak merusak.** Tiap `PUT` berdiri sendiri; job yang berhenti di tengah meninggalkan sebagian rapi dan sebagian belum — menjalankan ulang menyelesaikannya, karena perhitungan tidak bergantung pada keadaan sebelumnya (idempoten).
- **Berjalan sebagai job latar** dengan kemajuan yang bisa dipantau, mengikuti pola `url_import_job`. Ratusan permintaan melewati batas 100 detik Cloudflare.
- **Impor yang sedang berjalan harus diperingatkan.** Batch impor aktif terus menambah jadwal baru selama perapian bekerja, sehingga hasilnya kembali tidak rapi di ekor deret. Ini terjadi pada perapian pertama — sisa jam setengahan di tanggal akhir. UI harus menolak atau memperingatkan bila ada job impor berstatus `running` untuk akun yang sama.

## 8. Kriteria Terima

1. Pratinjau tidak mengirim satu pun `PUT`.
2. Setelah diterapkan, seluruh jadwal pending akun berjarak tepat sebesar jeda, tanpa duplikat jam.
3. Caption, media, tipe, dan akun tidak berubah — dibuktikan dengan membandingkan satu jadwal sebelum dan sesudah.
4. Jadwal `success` tidak tersentuh.
5. Menjalankan dua kali berturut-turut dengan parameter sama: jalan kedua melaporkan 0 perubahan.
6. Job yang dihentikan di tengah jalan meninggalkan data yang sah, dan menjalankan ulang merapikan sisanya.

## 9. Risiko

| Risiko | Dampak | Penanganan |
|---|---|---|
| `PUT` mengganti seluruh isi | Caption/media hilang bila body tidak lengkap | Baca jadwal lengkap lebih dulu; uji satu jadwal sebelum massal |
| Impor berjalan bersamaan | Hasil kembali berantakan di ekor | Tolak/peringatkan bila ada job `running` |
| Titik mulai di masa lalu | Konten terbit serentak | Validasi di backend, bukan hanya di UI |
| Rate limit Repliz | Sebagian gagal | Jeda 120 ms; laporkan yang gagal agar bisa diulang |
| Tier turun dari Premium+ | Endpoint ditolak | Tampilkan pesan Repliz apa adanya, jangan diterjemahkan menjadi "gagal" |

## 10. Rencana Teknis

**Backend** — `ScheduleRemapService` di modul `repliz-sync`:

- `preview(accountId, mulai, jeda, maksPerHari)` → daftar perubahan, tanpa efek samping.
- `apply(...)` → membuat job, memproses di latar, memperbarui kemajuan per batch.
- `ReplizService.updateSchedule(scheduleId, payload)` — belum ada, perlu ditambahkan di samping `createSchedule`/`deleteSchedules` yang sudah ada.

**Endpoint:**

```
POST /api/repliz-sync/schedule-remap/preview
POST /api/repliz-sync/schedule-remap
GET  /api/repliz-sync/schedule-remap/:id
```

**Frontend** — panel baru di halaman Impor URL, memakai pola job yang sudah ada (`useGetImportJob`, tabel batch, tombol Hentikan).

**Referensi kode:** perhitungan slot ada di `url-import.service.ts` fungsi `scheduleTimeAt()`; skrip perapian pertama tersimpan di scratchpad sesi sebagai `remap.py`.
