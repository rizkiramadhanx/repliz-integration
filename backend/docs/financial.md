# Financial API Documentation

**Base URL:** `/api/financial`

API untuk data financial (laporan keuangan dari registrasi PAID). Semua endpoint memerlukan **JWT authentication**. Permission: `financial:read` untuk GET, `financial:delete` untuk DELETE.

**Format data:**

- **find-all** dan **find-all-event**: `data` berupa **array of object** dengan key: `id`, `trx_code`, `event_id`, `event_name`, `event_category_id`, `event_category_name`, `name_person`, `phone`, `paid_datetime`, `price`. Nilai kosong = `null`.
- **financial-by-event**: data tabular (array of array), urutan kolom sama. Hanya endpoint ini yang return tabular.

---

## Find All

**GET** `/api/financial/find-all`

List semua data financial dari tabel financial (array of object dengan key). Filter opsional by event dan/atau event category.

**Permissions:** `financial:read`

### Query Parameters

| Parameter         | Type          | Required | Description              |
| ----------------- | ------------- | -------- | ------------------------ |
| event_id          | string (UUID) | No       | Filter by event          |
| event_category_id | string (UUID) | No       | Filter by event category |

### Response

```json
{
  "message": "",
  "code": 200,
  "status": "success",
  "data": [
    {
      "id": "uuid",
      "trx_code": "TRX-A1B2C3",
      "event_id": "uuid-event",
      "event_name": "Nama Event",
      "event_category_id": "uuid-cat",
      "event_category_name": "Kategori A",
      "name_person": "Budi",
      "phone": "08123456789",
      "paid_datetime": "2025-10-14T12:00:00.000Z",
      "price": 50000
    },
    {
      "id": "uuid",
      "trx_code": "TRX-X9Y8Z7",
      "event_id": "uuid-event",
      "event_name": "Nama Event",
      "event_category_id": "uuid-cat",
      "event_category_name": "Kategori A",
      "name_person": "Ani",
      "phone": "08198765432",
      "paid_datetime": "2025-10-14T11:00:00.000Z",
      "price": 50000
    }
  ]
}
```

---

## Find All By Event (Grouping) — untuk page

**GET** `/api/financial/find-all-event/:id`

Data financial untuk **satu event**, dikelompokkan per **event_category**. Cocok untuk dipakai di page. `:id` = `event_id` (UUID).  
`data` di tiap event_category = **array of object** (dengan key), bukan array tabular.

**Permissions:** `financial:read`

### Path Parameters

| Parameter | Type          | Description |
| --------- | ------------- | ----------- |
| id        | string (UUID) | Event ID    |

### Response

```json
{
  "message": "",
  "code": 200,
  "status": "success",
  "data": {
    "event": { "id": "uuid-event", "name": "Nama Event" },
    "event_category": [
      {
        "event_category": { "id": "uuid-cat-1", "name": "Kategori A" },
        "data": [
          {
            "id": "uuid",
            "trx_code": "TRX-XXX",
            "event_id": "uuid-event",
            "event_name": "Nama Event",
            "event_category_id": "uuid-cat-1",
            "event_category_name": "Kategori A",
            "name_person": "Budi",
            "phone": "08123456789",
            "paid_datetime": "2025-10-14T12:00:00.000Z",
            "price": 50000
          }
        ]
      },
      {
        "event_category": { "id": "uuid-cat-2", "name": "Kategori B" },
        "data": []
      }
    ]
  }
}
```

---

## Process Data By Event

**GET** `/api/financial/financial-by-event`

**Process:** Hapus data financial untuk event tersebut, lalu sync dari registrasi status **PAID** untuk event itu ke tabel financial, return data tabular. Berguna untuk refresh data sebelum dipakai. **event_id wajib.**

**Permissions:** `financial:read`

### Query Parameters

| Parameter | Type          | Required | Description                                         |
| --------- | ------------- | -------- | --------------------------------------------------- |
| event_id  | string (UUID) | **Yes**  | Event ID. Wajib. Clear + sync PAID untuk event ini. |

### Response (Success)

```json
{
  "message": "berhasil",
  "code": 200,
  "status": "success",
  "data": [
    ["id", "trx_code", "event_id", "event_name", "event_category_id", "event_category_name", "name_person", "phone", "paid_datetime", "price"],
    ...
  ]
}
```

Format `data` = array of rows tabular (sama seperti Find All).

### Error (400 — event_id kosong/tidak dikirim)

```json
{
  "message": "event_id is required",
  "code": 400,
  "status": "error",
  "data": null
}
```

---

## Delete Financial Record

**DELETE** `/api/financial/:id`

Hapus satu baris financial by id (id baris di tabel financial, bukan registration_event id).

**Permissions:** `financial:delete`

### Path Parameters

| Parameter | Type          | Description         |
| --------- | ------------- | ------------------- |
| id        | string (UUID) | Financial record ID |

### Response (Success)

```json
{
  "message": "Deleted successfully",
  "code": 200,
  "status": "success",
  "data": { "message": "Deleted successfully" }
}
```

### Error (404)

```json
{
  "message": "Financial record not found",
  "code": 404,
  "status": "error",
  "data": null
}
```
