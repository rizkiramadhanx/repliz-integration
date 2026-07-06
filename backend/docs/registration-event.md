# 📝 Registration Event API Documentation

**Base URL:** `/api/registration-event`

CRUD pendaftaran event (registrasi peserta per event category). Semua endpoint memerlukan **autentikasi JWT** dan permission `registration_event:*`. ID dan `event_category_id` berupa **UUID**.

### Registration Event Status Enum

Kolom `status` pada registration event bertipe enum di database maupun pada API. Nilai yang diterima/dikirim adalah salah satu dari:

- `PENDING`  
  _(Default. Peserta belum melakukan pembayaran/konfirmasi.)_
- `REJECTED`  
  _(Pendaftaran ditolak atau dibatalkan admin.)_
- `PAID`  
  _(Peserta dinyatakan sudah membayar/tagihan terkonfirmasi, berhak mengikuti event.)_
- `EXPIRED`  
  _(Pendaftaran peserta expired, misal melebihi batas waktu pembayaran.)_

**Database**: Tipe `registration_event_status_enum`  
**API**: string salah satu dari: `"PENDING"`, `"REJECTED"`, `"PAID"`, `"EXPIRED"`

Jika field `status` tidak dikirim saat registrasi, maka otomatis bernilai **PENDING**.  
Nilai ini juga digunakakan saat filter/list registrasi peserta event.

---

## 📌 Create Registration Event

**POST** `/api/registration-event`

### Request Body

Cukup kirim `event_category_id`, `name`, dan `phone`. Field lain otomatis.

```json
{
  "event_category_id": "550e8400-e29b-41d4-a716-446655440020",
  "name": "Budi Santoso",
  "phone": "08123456789"
}
```

| Field               | Tipe          | Wajib | Keterangan                                                                                            |
| ------------------- | ------------- | ----- | ----------------------------------------------------------------------------------------------------- |
| event_category_id   | string (UUID) | ✅    | ID event category                                                                                     |
| name                | string        | ✅    | Nama peserta, max 255                                                                                 |
| phone               | string        | ✅    | No. telepon, max 50                                                                                   |
| expired_at          | string        | -     | ISO datetime (batas bayar). **Tidak perlu dikirim:** otomatis +12 jam dari waktu dibuat.              |
| time_reregistration | string        | -     | ISO datetime (waktu daftar ulang). **Tidak perlu dikirim:** default null.                             |
| status              | string        | -     | **Tidak perlu dikirim:** otomatis **PENDING**. Nilai: `PENDING` \| `REJECTED` \| `PAID` \| `EXPIRED`. |

**Catatan:** Saat create, `expired_at` = waktu dibuat + 12 jam, `time_reregistration` = null, `status` = **PENDING**.

### Response

```json
{
  "status": 201,
  "message": "Registration event created successfully",
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440030",
    "event_category_id": "550e8400-e29b-41d4-a716-446655440020",
    "name": "Budi Santoso",
    "phone": "08123456789",
    "expired_at": "2025-10-14T23:59:59.000Z",
    "time_reregistration": null,
    "status": "PENDING",
    "created_at": "2025-10-14T12:00:00.000Z",
    "updated_at": "2025-10-14T12:00:00.000Z"
  }
}
```

---

## 📌 Get All Registration Events

**GET** `/api/registration-event`

### Query Parameters

| Parameter           | Tipe          | Default | Keterangan               |
| ------------------- | ------------- | ------- | ------------------------ |
| `page`              | number        | 1       | Halaman                  |
| `limit`             | number        | 10      | Jumlah per halaman       |
| `keyword`           | string        | -       | Filter by name, trx_code, atau phone (ILike, OR) |
| `event_category_id` | string (UUID) | -       | Filter by event category |

### Example

```
GET /api/registration-event?page=1&limit=10&event_category_id=550e8400-e29b-41d4-a716-446655440020
```

### Response

```json
{
  "status": 200,
  "message": "Get all registration events success",
  "data": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440030",
      "event_category_id": "550e8400-e29b-41d4-a716-446655440020",
      "trx_code": "TRX-ABC123",
      "name": "Budi Santoso",
      "phone": "08123456789",
      "expired_at": "2025-10-14T23:59:59.000Z",
      "time_reregistration": null,
      "status": "PENDING",
      "created_at": "2025-10-14T12:00:00.000Z",
      "updated_at": "2025-10-14T12:00:00.000Z",
      "event_category": {
        "id": "550e8400-e29b-41d4-a716-446655440020",
        "name": "Kategori Dewasa"
      }
    }
  ],
  "meta": {
    "page": 1,
    "limit": 10,
    "total": 1,
    "total_page": 1
  }
}
```

---

## 📌 Get Registration Event By ID

**GET** `/api/registration-event/:id`

### Response

```json
{
  "status": 200,
  "message": "Get registration event success",
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440030",
    "event_category_id": "550e8400-e29b-41d4-a716-446655440020",
    "name": "Budi Santoso",
    "phone": "08123456789",
    "expired_at": "2025-10-14T23:59:59.000Z",
    "time_reregistration": null,
    "status": "PENDING",
    "created_at": "2025-10-14T12:00:00.000Z",
    "updated_at": "2025-10-14T12:00:00.000Z",
    "event_category": {
      "id": "550e8400-e29b-41d4-a716-446655440020",
      "name": "Kategori Dewasa"
    }
  }
}
```

---

## 📌 List by trx_code

**GET** `/api/registration-event/trx/:trxCode`

Mengembalikan daftar semua registrasi yang memiliki `trx_code` yang sama (satu transaksi bisa punya banyak item registrasi). Urutan berdasarkan `created_at` ascending.

**Permission:** `registration_event:read`

### Path Parameters

| Parameter | Tipe   | Keterangan        |
| --------- | ------ | ------------------ |
| trxCode   | string | Kode transaksi (contoh: `TRX-ABC123`) |

### Example

```
GET /api/registration-event/trx/TRX-ABC123
```

### Response

```json
{
  "status": 200,
  "message": "Get registrations by trx_code success",
  "data": [
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
```

Jika tidak ada registrasi dengan `trx_code` tersebut, response tetap **200** dengan `data: []`.

---

## 📌 Update Registration Event

**PATCH** `/api/registration-event/:id`

`id` berupa **UUID**. Semua field opsional.

### Request Body

```json
{
  "event_category_id": "550e8400-e29b-41d4-a716-446655440020",
  "name": "Budi Santoso Updated",
  "phone": "08199887766",
  "expired_at": "2025-10-15T23:59:59.000Z",
  "time_reregistration": "2025-10-16T08:00:00.000Z",
  "status": "PAID"
}
```

`expired_at` dan `time_reregistration` dalam format ISO datetime.

### Response

```json
{
  "status": 200,
  "message": "Registration event updated successfully",
  "data": { ... }
}
```

---

## 📌 Update Status by trx_code

**PATCH** `/api/registration-event/trx/:trxCode`

Mengupdate **status** semua registrasi yang memiliki `trx_code` yang sama (satu transaksi bisa punya banyak baris registrasi). Berguna untuk konfirmasi pembayaran sekaligus untuk seluruh item dalam satu transaksi.

**Permission:** `registration_event:update`

### Path Parameters

| Parameter | Tipe   | Keterangan        |
| --------- | ------ | ------------------ |
| trxCode   | string | Kode transaksi (contoh: `TRX-ABC123`) |

### Request Body

```json
{
  "status": "PAID"
}
```

| Field  | Tipe   | Wajib | Keterangan                                                                 |
| ------ | ------ | ----- | --------------------------------------------------------------------------- |
| status | string | ✅    | Salah satu: `PENDING` \| `REJECTED` \| `PAID` \| `EXPIRED`                  |

### Response (Success)

```json
{
  "status": 200,
  "message": "Status updated successfully",
  "data": {
    "registrations": [
      {
        "id": "uuid-reg-1",
        "event_category_id": "uuid-kategori",
        "trx_code": "TRX-ABC123",
        "name": "Budi",
        "phone": "08123456789",
        "expired_at": "...",
        "time_reregistration": null,
        "status": "PAID",
        "created_at": "...",
        "updated_at": "..."
      }
    ]
  }
}
```

### Error Responses

- **404** – Tidak ada registrasi dengan `trx_code` tersebut: `"Registrasi dengan trx_code \"...\" tidak ditemukan"`
- **400** – Kuota kategori penuh (saat mengubah status ke `PAID`): `"Kuota peserta untuk kategori ini sudah penuh (max ...)"`

---

## 📌 Reregister (isi form participant)

**POST** `/api/registration-event/:id/reregister`

Hanya untuk registrasi dengan status **PAID**. Akan mengisi `time_reregistration` = sekarang dan membuat **participant** baru dengan `event_category_id` dari registrasi ini. Body berisi form participant (nama bisa pakai dari registrasi bila tidak dikirim).

**Permission:** `registration_event:update`

### Request Body

Semua field opsional. Jika `name` tidak dikirim, dipakai nama dari data registrasi.

```json
{
  "name": "Budi Santoso",
  "bird_name": "Bird One",
  "address": "Jakarta",
  "position": 1
}
```

| Field       | Tipe   | Wajib | Keterangan                    |
| ----------- | ------ | ----- | ----------------------------- |
| name        | string | -     | Nama peserta (max 255). Bila kosong = nama dari registrasi |
| bird_name   | string | -     | Nama burung, max 255          |
| address     | string | -     | Alamat, max 500               |
| position    | number | -     | Posisi (integer, min 0)       |

### Response

Response sama dengan **Get Registration Event By ID** (data registrasi ter-update, termasuk `event_category` dan `event`). Field `time_reregistration` terisi dengan waktu reregister.

### Error

- **400** – Registrasi bukan status PAID: `"Hanya registrasi dengan status PAID yang dapat reregister"`
- **404** – Registrasi tidak ditemukan

---

## 📌 Delete Registration Event

**DELETE** `/api/registration-event/:id`

### Response

```json
{
  "status": 200,
  "message": "Registration event deleted successfully",
  "data": {
    "message": "Registration event deleted successfully"
  }
}
```

---

## 🔐 Permissions

| Endpoint                                      | Permission                  |
| --------------------------------------------- | --------------------------- |
| `GET /api/registration-event`                  | `registration_event:read`   |
| `GET /api/registration-event/trx/:trxCode`     | `registration_event:read`   |
| `GET /api/registration-event/:id`              | `registration_event:read`   |
| `POST /api/registration-event`                | `registration_event:create` |
| `PATCH /api/registration-event/trx/:trxCode`   | `registration_event:update` |
| `POST /api/registration-event/:id/reregister`  | `registration_event:update` |
| `PATCH /api/registration-event/:id`            | `registration_event:update` |
| `DELETE /api/registration-event/:id`          | `registration_event:delete` |

---

## ⚠️ Error Responses

### Not Found (404)

```json
{
  "status": 404,
  "message": "Registration event not found"
}
```
