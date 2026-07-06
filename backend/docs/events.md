# 📅 Event API Documentation

**Base URL:** `/api/event`

CRUD event. Semua endpoint memerlukan **autentikasi JWT** dan permission `event:*`. ID berupa **UUID**. Create dan Update mendukung **multipart/form-data** untuk upload file (gambar background, brosur).

---

## 📌 Create Event

**POST** `/api/event`

**Content-Type:** `multipart/form-data` (untuk upload file) atau `application/json` (hanya field).

### Request Body (form-data / JSON)

| Field            | Tipe   | Wajib | Keterangan                                              |
| ---------------- | ------ | ----- | ------------------------------------------------------- |
| name             | string | ✅    | Nama event, max 255                                     |
| date             | string | ✅    | Tanggal (YYYY-MM-DD)                                    |
| address          | string | ✅    | Alamat, max 500                                         |
| address_url      | string | -     | URL map, max 500                                         |
| image_background | file / string | - | File gambar **atau** URL; field file: `image_background` atau `imageBackground` |
| description      | string | -     | Deskripsi (text)                                        |
| brochure         | file / string | - | File PDF/dokumen **atau** URL; field file: `brochure` atau `brochureFile` |

File yang di-upload disimpan di `/uploads/events/` dan URL-nya (mis. `/uploads/events/uuid-filename.jpg`) disimpan di response.

### Contoh (multipart/form-data)

- Field teks: `name`, `date`, `address`, `address_url`, `description`
- File: `image_background` (gambar), `brochure` (PDF/dokumen)

### Response

```json
{
  "status": 201,
  "message": "Event created successfully",
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440010",
    "name": "Sample Event 2025",
    "date": "2025-10-15",
    "address": "Jl. Contoh No. 1, Kota Bandung",
    "address_url": "https://maps.google.com/...",
    "image_background": "/uploads/events/550e8400-e29b-41d4-a716-446655440011.jpg",
    "description": "Deskripsi acara...",
    "brochure": "/uploads/events/550e8400-e29b-41d4-a716-446655440012.pdf",
    "created_at": "2025-09-19T10:00:00.000Z",
    "updated_at": "2025-09-19T10:00:00.000Z"
  }
}
```

---

## 📌 Get All Events

**GET** `/api/event`

### Query Parameters

| Parameter | Tipe   | Default | Keterangan        |
| --------- | ------ | ------- | ----------------- |
| `page`    | number | 1       | Halaman           |
| `limit`   | number | 10      | Jumlah per halaman |
| `keyword` | string | -       | Filter nama       |

### Example

```
GET /api/event?page=1&limit=10&keyword=Sample
```

### Response

```json
{
  "status": 200,
  "message": "Get all events success",
  "data": [ ... ],
  "meta": {
    "page": 1,
    "limit": 10,
    "total": 1,
    "total_page": 1
  }
}
```

---

## 📌 Get Event By ID

**GET** `/api/event/:id`

`id` berupa **UUID**.

### Response

```json
{
  "status": 200,
  "message": "Get event success",
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440010",
    "name": "Sample Event 2025",
    "date": "2025-10-15",
    "address": "...",
    "address_url": "...",
    "image_background": "/uploads/events/...",
    "description": "...",
    "brochure": "...",
    "created_at": "...",
    "updated_at": "..."
  }
}
```

---

## 📌 Update Event

**PATCH** `/api/event/:id`

`id` berupa **UUID**. Semua field opsional. Mendukung **multipart/form-data** untuk upload file baru (`image_background`, `brochure`).

### Request Body (form-data / JSON)

```json
{
  "name": "Sample Event 2025 (Updated)",
  "date": "2025-10-20",
  "address": "Alamat baru",
  "description": "Deskripsi baru"
}
```

File: `image_background`, `imageBackground`, `brochure`, `brochureFile` (opsional).

### Response

```json
{
  "status": 200,
  "message": "Event updated successfully",
  "data": { ... }
}
```

---

## 📌 Delete Event

**DELETE** `/api/event/:id`

`id` berupa **UUID**.

### Response

```json
{
  "status": 200,
  "message": "Event deleted successfully",
  "data": {
    "message": "Event deleted successfully"
  }
}
```

---

## 🔐 Permissions

| Endpoint          | Permission    |
| ----------------- | ------------- |
| `GET /api/event`  | `event:read`  |
| `GET /api/event/:id` | `event:read` |
| `POST /api/event` | `event:create` |
| `PATCH /api/event/:id` | `event:update` |
| `DELETE /api/event/:id` | `event:delete` |

---

## ⚠️ Error Responses

### Not Found (404)

```json
{
  "status": 404,
  "message": "Event not found"
}
```
