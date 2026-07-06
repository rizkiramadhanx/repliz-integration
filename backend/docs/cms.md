# CMS Public API Documentation

**Base URL:** `/api/cms`

API publik untuk frontend/CMS: list event, daftar event, dan list peserta per event. **Tidak memerlukan autentikasi** (no JWT).

---

## Get All Events

**GET** `/api/cms/events`

Mengembalikan daftar event dengan filter opsional.

### Query Parameters

| Parameter | Tipe   | Wajib | Nilai                    | Keterangan                                      |
| --------- | ------ | ----- | ------------------------ | ----------------------------------------------- |
| filter    | string | ❌    | `all` \| `ended` \| `akan_mulai` | Default: `all`. `ended` = sudah lewat, `akan_mulai` = belum/sedang berjalan. |

### Response

```json
{
  "message": "OK",
  "code": 200,
  "status": "success",
  "data": {
    "data": [
      {
        "id": "550e8400-e29b-41d4-a716-446655440000",
        "name": "Event Name",
        "date": "2025-12-01",
        "description": "...",
        "image_background": "https://...",
        "brochure": "https://...",
        "created_at": "2025-10-01T00:00:00.000Z",
        "updated_at": "2025-10-01T00:00:00.000Z"
      }
    ]
  }
}
```

---

## Get Event Categories By Event

**GET** `/api/cms/event/:id/event-category`

Mengembalikan daftar event category untuk satu event. `:id` = event ID (UUID).

### Path Parameters

| Parameter | Tipe          | Keterangan |
| --------- | ------------- | ---------- |
| id        | string (UUID) | Event ID   |

### Response

```json
{
  "message": "OK",
  "code": 200,
  "status": "success",
  "data": {
    "data": [
      {
        "id": "uuid-cat",
        "event_id": "uuid-event",
        "name": "Kategori A",
        "price": 50000,
        "max_participant": 100,
        "description": "...",
        "event": { "id": "...", "name": "...", "date": "...", "address": "...", "address_url": null, "image_background": null, "description": null, "brochure": null, "created_at": "...", "updated_at": "..." },
        "created_at": "2025-10-01T00:00:00.000Z",
        "updated_at": "2025-10-01T00:00:00.000Z"
      }
    ]
  }
}
```

---

## Get Event Category Detail (by ID)

**GET** `/api/cms/event-category/:id`

Mengembalikan detail satu event category beserta nama event, nama kategori, tanggal event, dan daftar peserta (participants) untuk kategori tersebut. `:id` = event category ID (UUID).

### Path Parameters

| Parameter | Tipe          | Keterangan           |
| --------- | ------------- | -------------------- |
| id        | string (UUID) | Event category ID    |

### Response

```json
{
  "message": "OK",
  "code": 200,
  "status": "success",
  "data": {
    "name_event": "Nama Event",
    "name_event_category": "Kategori A",
    "date": "2025-12-01",
    "address": "Jl. Venue No. 1, Jakarta",
    "list": [
      {
        "id": "uuid-participant",
        "event_category_id": "uuid-category",
        "name": "Budi",
        "bird_name": "Kacer",
        "address": "Jakarta",
        "position": 1,
        "created_at": "2025-10-14T12:00:00.000Z",
        "updated_at": "2025-10-14T12:00:00.000Z"
      }
    ]
  }
}
```

| Field               | Keterangan                                      |
| ------------------- | ----------------------------------------------- |
| name_event          | Nama event (dari event)                         |
| name_event_category | Nama kategori event                             |
| date                | Tanggal event (YYYY-MM-DD)                      |
| address             | Alamat/lokasi event                             |
| list                | Array peserta (participants) untuk kategori ini, urut `created_at` terbaru; tanpa field `event_category` |

### Error Responses

- **404** – Event category tidak ditemukan.

---

## Register (Public)

**POST** `/api/cms/register`

Mendaftarkan peserta ke satu atau beberapa event category. Body berisi `name`, `phone`, dan array `data` (setiap item: `id_event_category`, `qty`). Setiap kombinasi kategori × qty menghasilkan satu registrasi terpisah (status **PENDING**); `expired_at` di-set otomatis dari env (`REGISTRATION_EXPIRY_HOURS`). **Semua registrasi dalam satu request memakai `trx_code` yang sama** (satu transaksi untuk banyak item).

### Request Body

```json
{
  "name": "string",
  "phone": "string",
  "data": [
    { "id_event_category": "uuid-kategori", "qty": 1 },
    { "id_event_category": "uuid-kategori-lain", "qty": 2 }
  ]
}
```

| Field             | Tipe   | Wajib | Keterangan                                      |
| ----------------- | ------ | ----- | ----------------------------------------------- |
| name              | string | ✅    | Nama peserta, max 255                           |
| phone             | string | ✅    | No. telepon, max 50                             |
| data              | array  | ✅    | Min 1 item. Setiap item: id_event_category, qty  |
| data[].id_event_category | string (UUID) | ✅ | ID event category |
| data[].qty        | number | ✅    | Jumlah tiket (1–50 per kategori)                 |

### Response (Success)

```json
{
  "message": "Registration submitted successfully",
  "code": 200,
  "status": "success",
  "data": {
    "trx_code": "TRX-ABC123",
    "registrations": [
      {
        "id": "uuid-reg-1",
        "event_category_id": "uuid-kategori",
        "name": "string",
        "phone": "string",
        "trx_code": "TRX-ABC123",
        "expired_at": "2025-10-15T00:00:00.000Z",
        "time_reregistration": null,
        "status": "PENDING",
        "created_at": "...",
        "updated_at": "..."
      }
    ]
  }
}
```

| Field | Keterangan |
| ----- | ---------- |
| trx_code | Kode transaksi untuk seluruh registrasi dalam request ini (sama untuk semua item). |
| registrations | Array data registrasi yang dibuat. |

### Error Responses

- **400** – Validasi gagal (name/phone kosong, data kosong, id_event_category invalid, qty di luar 1–50) atau kuota kategori penuh.
- **404** – Salah satu event category tidak ditemukan.

---

## Check TRX (Public)

**POST** `/api/cms/check-trx`

Mengecek transaksi berdasarkan `trx_code`. Mengembalikan daftar registrasi dengan trx_code tersebut dan status (status dari item pertama; semua item dalam satu trx biasanya sama).

### Request Body

```json
{
  "trx_code": "TRX-ABC123"
}
```

| Field     | Tipe   | Wajib | Keterangan        |
| --------- | ------ | ----- | ----------------- |
| trx_code  | string | ✅    | Kode transaksi    |

### Response (Success)

```json
{
  "message": "OK",
  "code": 200,
  "status": "success",
  "data": {
    "status": "PENDING",
    "list": [
      {
        "id": "uuid-reg-1",
        "event_category_id": "uuid-kategori",
        "trx_code": "TRX-ABC123",
        "name": "Budi",
        "phone": "08123456789",
        "expired_at": "...",
        "time_reregistration": null,
        "status": "PENDING",
        "created_at": "...",
        "updated_at": "...",
        "event_category": { "id": "...", "name": "Kategori A" },
        "event": { "id": "...", "name": "Event Name", "date": "2025-12-01" }
      }
    ]
  }
}
```

| Field  | Keterangan                                                                 |
| ------ | -------------------------------------------------------------------------- |
| status | Status transaksi (dari registrasi pertama); `PENDING` \| `REJECTED` \| `PAID` \| `EXPIRED` |
| list   | Array registrasi dengan trx_code tersebut (urut `created_at` ASC)           |

Jika `trx_code` tidak ditemukan: `list: []`, `status: null`.

---

## Get Participants by Event

**GET** `/api/cms/participant/event/:id`

Mengembalikan peserta per event, dikelompokkan per **event category**. Hanya peserta yang sudah memiliki ranking (hasil process), diurutkan ranking ASC.

### Path Parameters

| Parameter | Tipe          | Keterangan   |
| --------- | ------------- | ------------ |
| id        | string (UUID) | ID event     |

### Response

```json
{
  "message": "OK",
  "code": 200,
  "status": "success",
  "data": [
    {
      "event_category": {
        "id": "550e8400-e29b-41d4-a716-446655440020",
        "name": "Kategori A"
      },
      "data": [
        {
          "id": "550e8400-e29b-41d4-a716-446655440040",
          "name": "Budi",
          "bird_name": "Kacer",
          "address": "Jakarta",
          "position": 1,
          "ranking": 1,
          "score": 4,
          "event_category": { "id": "...", "name": "Kategori A" },
          "created_at": "2025-10-14T12:00:00.000Z",
          "updated_at": "2025-10-14T12:00:00.000Z"
        }
      ]
    }
  ]
}
```

Setiap item di `data` adalah satu event category dengan `event_category: { id, name }` dan array `data` berisi participant yang sudah diranking (id, name, bird_name, address, position, ranking, score, created_at, updated_at), urut ranking ASC.

---

## Get Participants by Event Category

**GET** `/api/cms/participant/event-category/:id`

Mengembalikan daftar peserta untuk **satu event category**. `:id` = event category ID (UUID).

### Path Parameters

| Parameter | Tipe          | Keterangan           |
| --------- | ------------- | --------------------- |
| id        | string (UUID) | Event category ID    |

### Response

```json
{
  "message": "OK",
  "code": 200,
  "status": "success",
  "data": {
    "name_event": "Nama Event",
    "name_event_category": "Kategori A",
    "date": "2025-12-01",
    "address": "Jl. Venue No. 1, Jakarta",
    "list": [
      {
        "id": "550e8400-e29b-41d4-a716-446655440050",
        "event_category_id": "550e8400-e29b-41d4-a716-446655440020",
        "name": "Budi",
        "bird_name": "Kacer",
        "address": "Jakarta",
        "position": 1,
        "ranking": 1,
        "score": 4,
        "created_at": "2025-10-14T12:00:00.000Z",
        "updated_at": "2025-10-14T12:00:00.000Z"
      }
    ]
  }
}
```

| Field               | Keterangan |
| ------------------- | ---------- |
| name_event          | Nama event (dari event) |
| name_event_category| Nama kategori event |
| date                | Tanggal event (YYYY-MM-DD) |
| address             | Alamat/lokasi event |
| list                | Array peserta untuk kategori ini (tanpa field `event_category`). Tiap item: id, event_category_id, name, bird_name, address, position, ranking, score, created_at, updated_at. |

Tidak memerlukan autentikasi.

---

## Get Event Category Winner (Rekap Ajuan Juri + Daftar Pemenang)

**GET** `/api/cms/participant/event-category-winner/:id`

Mengembalikan data untuk tampilan pemenang: info event, **rekap ajuan juri** (nama juri + pengajuan nominasi), **rekap point** (jumlah juri yang memilih per peserta), dan **daftar pemenang** (participant dengan ranking, urut peringkat). Sesuai tampilan layar "Rekap Ajuan Juri" dan Rekap Point.

### Path Parameters

| Parameter | Tipe          | Keterangan           |
| --------- | ------------- | --------------------- |
| id        | string (UUID) | Event category ID    |

### Response

```json
{
  "message": "OK",
  "code": 200,
  "status": "success",
  "data": {
    "name_event": "WIJAYA KUSUMA EXCLUSIVE",
    "name_event_category": "URAI BATU B PERSAUDARAAN",
    "date": "2025-06-22",
    "address": "Jl. Venue No. 1, Cilacap",
    "rekap_ajuan_juri": [
      {
        "name": "Juri A",
        "pengajuan_nominasi": [14, 7, 23, 3, 2]
      },
      {
        "name": "Juri B",
        "pengajuan_nominasi": [14, 3, 6, 23, 7]
      },
      {
        "name": "Juri C",
        "pengajuan_nominasi": [14, 23, 6, 2, 17]
      },
      {
        "name": "Juri D",
        "pengajuan_nominasi": [14, 3, 23, 21, 2]
      }
    ],
    "recap_point": [
      { "point": 4, "position": [14, 23] },
      { "point": 3, "position": [2, 3] },
      { "point": 2, "position": [6, 7] },
      { "point": 1, "position": [17, 21] }
    ],
    "list": [
      {
        "id": "550e8400-e29b-41d4-a716-446655440050",
        "event_category_id": "550e8400-e29b-41d4-a716-446655440020",
        "name": "Pemenang 1",
        "bird_name": "Kacer",
        "address": "Jakarta",
        "position": 14,
        "ranking": 1,
        "score": 4,
        "created_at": "2025-10-14T12:00:00.000Z",
        "updated_at": "2025-10-14T12:00:00.000Z"
      },
      {
        "id": "550e8400-e29b-41d4-a716-446655440051",
        "event_category_id": "550e8400-e29b-41d4-a716-446655440020",
        "name": "Pemenang 2",
        "bird_name": "Murai",
        "address": "Bandung",
        "position": 23,
        "ranking": 2,
        "score": 3,
        "created_at": "2025-10-14T12:00:00.000Z",
        "updated_at": "2025-10-14T12:00:00.000Z"
      }
    ]
  }
}
```

| Field               | Keterangan |
| ------------------- | ---------- |
| name_event          | Nama event |
| name_event_category | Nama kategori event |
| date                | Tanggal event (YYYY-MM-DD) |
| address             | Alamat/lokasi event |
| rekap_ajuan_juri    | Array per juri: `name` (label juri), `pengajuan_nominasi` (array position peserta yang dinominasikan). |
| recap_point         | Rekap point: tiap entry berisi `point` (jumlah juri yang memilih) dan `position` (array nomor urut peserta yang mendapat point tersebut). Diurutkan descending by point. |
| list                | Daftar pemenang: hanya participant yang punya `ranking` (hasil process), urut per ranking. Tiap item format sama participant (id, name, bird_name, position, ranking, score, ...). |

Tidak memerlukan autentikasi.
