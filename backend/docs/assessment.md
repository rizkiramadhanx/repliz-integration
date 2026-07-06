# Assessment API Documentation

**Base path:** `/api/event-category/:eventCategoryId/assessment`

Assessment (penilaian juri) untuk lomba burung: menyimpan **Rekap Ajuan Juri** (nominasi per juri) dan lewat **Process** menghasilkan **Rekap Point** (skor & ranking per peserta). Semua endpoint membutuhkan **JWT** dan permission assessment: `assessment:read`, `assessment:create`, `assessment:update`, `assessment:delete`, `assessment:process`. `:eventCategoryId` adalah **UUID** event category.

---

## Data model

| Field               | Type       | Description |
| ------------------- | ---------- | ----------- |
| `id`                | UUID       | Primary key |
| `event_category_id` | UUID       | Event category |
| `name`              | string \| null | Label juri (contoh: "Juri A"). Jika tidak dicantumkan maka `null`. |
| `value`             | number[] \| null | Array **participant position** (urutan pilihan 1, 2, 3). Isi dari `participant.position`. Jika tidak dicantumkan maka `null`. |

**Contoh:** Satu baris assessment = satu juri. `name: "Juri A"`, `value: [1, 2, 3]` = pilihan 1 = participant dengan `position === 1`, pilihan 2 = `position === 2`, pilihan 3 = `position === 3`.

### Validation (create & update)

- Setiap angka di **value** harus berupa **position** yang benar-benar ada di event category tersebut (ada participant dengan `position` tersebut).
- Jika ada position yang tidak ada, API mengembalikan **400 Bad Request** dengan pesan daftar position yang invalid dan daftar position yang valid.

---

## Get assessments by event category

**GET** `/api/event-category/:eventCategoryId/assessment`

**Permission:** `assessment:read`

### Path parameters

| Parameter        | Type   | Description        |
| ---------------- | ------ | ------------------ |
| eventCategoryId  | UUID   | Event category ID  |

### Response

```json
{
  "message": "Get assessments by event category success",
  "code": 200,
  "status": "success",
  "data": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440001",
      "event_category_id": "550e8400-e29b-41d4-a716-446655440020",
      "name": "Juri A",
      "value": [1, 2, 3],
      "created_at": "2025-10-14T12:00:00.000Z",
      "updated_at": "2025-10-14T12:00:00.000Z"
    }
  ]
}
```

---

## Process ranking

**POST** `/api/event-category/:eventCategoryId/assessment/process`

Menghitung ranking juara dari data assessment (tombol Process). Tidak ada body.

**Permission:** `assessment:process`

### Path parameters

| Parameter       | Type | Description       |
| --------------- | -----| ------------------ |
| eventCategoryId | UUID | Event category ID  |

### Alur proses (sesuai tampilan Rekap Ajuan Juri → Rekap Point)

1. **Input — Rekap Ajuan Juri**  
   Data diambil dari list assessment: tiap baris = satu juri (kolom `name`), dengan **Pengajuan Nominasi** = kolom `value` (array nomor position peserta yang dinominasikan).

2. **Proses**  
   - **Tidak ada bobot juri**: tiap juri hanya memberi nilai **1** per nominasi (satu juri = maksimal nilai 1 per peserta yang ia pilih).  
   - Dari tiap juri, peserta yang ada di `value` dapat 1 poin (per juri, per peserta hanya dihitung sekali meski muncul berkali di list).  
   - **Nilai max peserta = jumlah juri** (jika semua juri memilih peserta tersebut).  
   - Poin dijumlahkan **per peserta**. Urutan: skor tertinggi dulu. **Satu juara bisa diisi beberapa peserta** (skor sama = peringkat sama, mis. juara 1 bisa ada 3 peserta).

3. **Output — Rekap Point**  
   Per peserta dihitung **total skor** dan **ranking**. Nilai disimpan ke tabel `participant`: kolom `score` (total skor) dan `ranking` (peringkat). Peserta yang tidak pernah dinominasikan: `score` dan `ranking` = `null`.

### Ranking logic (ringkas)

- Setiap baris assessment = satu juri; `value` = array participant position yang dinominasikan.
- **Tidak ada bobot**: tiap nominasi = 1 poin. Nilai max = jumlah juri.
- Skor dijumlah per participant. Peringkat sama jika skor sama (satu juara bisa beberapa peserta).
- Hasil disimpan ke `participant.ranking` dan `participant.score`, lalu dikembalikan.

### Response

```json
{
  "message": "Ranking processed successfully",
  "code": 200,
  "status": "success",
  "data": [
    {
      "participant_id": "550e8400-e29b-41d4-a716-446655440050",
      "position": 1,
      "total_skor": 4,
      "ranking": 1,
      "name": "John Doe"
    },
    {
      "participant_id": "550e8400-e29b-41d4-a716-446655440051",
      "position": 2,
      "total_skor": 4,
      "ranking": 1,
      "name": "Jane Doe"
    },
    {
      "participant_id": "550e8400-e29b-41d4-a716-446655440052",
      "position": 3,
      "total_skor": 2,
      "ranking": 3,
      "name": "Participant C"
    },
    {
      "participant_id": "550e8400-e29b-41d4-a716-446655440053",
      "position": 4,
      "total_skor": null,
      "ranking": null,
      "name": "Participant tanpa nominasi"
    }
  ]
}
```

- `total_skor` maksimal = jumlah juri (tiap juri kasih nilai 1). Skor sama → peringkat sama (satu juara bisa beberapa peserta).
- Field `position` dan `name`: jika tidak ada maka `null`.
- Peserta yang **tidak ada di list** (tidak pernah dinominasikan oleh juri): `total_skor` dan `ranking` dikembalikan `null`; tetap muncul di response.

---

## Create assessment

**POST** `/api/event-category/:eventCategoryId/assessment`

**Permission:** `assessment:create`

### Path parameters

| Parameter       | Type | Description       |
| --------------- | -----| ------------------ |
| eventCategoryId | UUID | Event category ID  |

### Request body

| Field | Type     | Required | Description |
| ----- | -------- | -------- | ----------- |
| name  | string   | No       | Label juri (max 255) |
| value | number[] | No       | Array participant position (max 10). Contoh: `[1, 2, 3]` |

### Example

```json
{
  "name": "Juri A",
  "value": [1, 2, 3]
}
```

### Response

```json
{
  "message": "Assessment created successfully",
  "code": 201,
  "status": "success",
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440001",
    "event_category_id": "550e8400-e29b-41d4-a716-446655440020",
    "name": "Juri A",
    "value": [1, 2, 3],
    "created_at": "2025-10-14T12:00:00.000Z",
    "updated_at": "2025-10-14T12:00:00.000Z"
  }
}
```

---

## Update assessment

**PATCH** `/api/event-category/:eventCategoryId/assessment/:id`

**Permission:** `assessment:update`

### Path parameters

| Parameter       | Type | Description        |
| --------------- | -----| ------------------- |
| eventCategoryId | UUID | Event category ID   |
| id              | UUID | Assessment ID       |

### Request body

| Field | Type     | Required | Description |
| ----- | -------- | -------- | ----------- |
| name  | string   | No       | Label juri (max 255) |
| value | number[] | No       | Array participant position (max 10) |

**Catatan:** Field yang **tidak dicantumkan** di body akan diset ke `null` (nilai lama ditimpa).

### Response

```json
{
  "message": "Assessment updated successfully",
  "code": 200,
  "status": "success",
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440001",
    "event_category_id": "550e8400-e29b-41d4-a716-446655440020",
    "name": "Juri A",
    "value": [2, 1, 3],
    "created_at": "2025-10-14T12:00:00.000Z",
    "updated_at": "2025-10-14T12:30:00.000Z"
  }
}
```

---

## Delete assessment

**DELETE** `/api/event-category/:eventCategoryId/assessment/:id`

**Permission:** `assessment:delete`

### Path parameters

| Parameter       | Type | Description        |
| --------------- | -----| ------------------- |
| eventCategoryId | UUID | Event category ID   |
| id              | UUID | Assessment ID       |

### Response

```json
{
  "message": "Assessment deleted successfully",
  "code": 200,
  "status": "success",
  "data": {
    "message": "Assessment deleted successfully"
  }
}
```

---

## Permissions summary

| Action   | Permission          | Endpoint / usage      |
| -------- | -------------------- | ---------------------- |
| List     | `assessment:read`    | GET .../assessment     |
| Process  | `assessment:process` | POST .../assessment/process |
| Create   | `assessment:create`  | POST .../assessment   |
| Update   | `assessment:update`  | PATCH .../assessment/:id |
| Delete   | `assessment:delete`  | DELETE .../assessment/:id |

Role harus memiliki action di atas (via Role/Permission) agar user bisa akses endpoint terkait.
