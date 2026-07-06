# 📂 Event Category API Documentation

**Base URL:** `/api/event-category`

CRUD kategori event (misal: kategori lomba per kelas). Semua endpoint memerlukan **autentikasi JWT** dan permission `event_category:*`. ID dan `event_id` berupa **UUID**.

---

## 📌 Create Event Category

**POST** `/api/event-category`

### Request Body

```json
{
  "event_id": "550e8400-e29b-41d4-a716-446655440010",
  "name": "Kategori Dewasa",
  "price": 150000,
  "max_participant": 50,
  "description": "Untuk peserta dewasa."
}
```

| Field            | Tipe   | Wajib | Keterangan              |
| ---------------- | ------ | ----- | ----------------------- |
| event_id         | string (UUID) | ✅ | ID event             |
| name             | string | ✅    | Nama kategori, max 255  |
| price            | number | -     | Harga (default 0)        |
| max_participant  | number | -     | Maks peserta            |
| description      | string | -     | Deskripsi               |

### Response

```json
{
  "status": 201,
  "message": "Event category created successfully",
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440020",
    "event_id": "550e8400-e29b-41d4-a716-446655440010",
    "name": "Kategori Dewasa",
    "price": 150000,
    "max_participant": 50,
    "description": "Untuk peserta dewasa.",
    "created_at": "...",
    "updated_at": "..."
  }
}
```

---

## 📌 Get All Event Categories

**GET** `/api/event-category`

### Query Parameters

| Parameter   | Tipe   | Default | Keterangan        |
| ----------- | ------ | ------- | ----------------- |
| `page`      | number | 1       | Halaman           |
| `limit`     | number | 10      | Jumlah per halaman |
| `keyword`   | string | -       | Filter nama       |
| `event_id`  | string (UUID) | - | Filter by event ID |

### Example

```
GET /api/event-category?page=1&limit=10&event_id=550e8400-e29b-41d4-a716-446655440010
```

### Response

```json
{
  "status": 200,
  "message": "Get all event categories success",
  "data": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440020",
      "event_id": "550e8400-e29b-41d4-a716-446655440010",
      "name": "Kategori Dewasa",
      "price": 150000,
      "max_participant": 50,
      "description": "...",
      "created_at": "...",
      "updated_at": "...",
      "event": { "id": "550e8400-e29b-41d4-a716-446655440010", "name": "Sample Event 2025" }
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

## 📌 Get Event Category By ID

**GET** `/api/event-category/:id`

### Response

```json
{
  "status": 200,
  "message": "Get event category success",
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440020",
    "event_id": "550e8400-e29b-41d4-a716-446655440010",
    "name": "Kategori Dewasa",
    "price": 150000,
    "max_participant": 50,
    "description": "...",
    "created_at": "...",
    "updated_at": "...",
    "event": { "id": "550e8400-e29b-41d4-a716-446655440010", "name": "Sample Event 2025" }
  }
}
```

---

## 📌 Update Event Category

**PATCH** `/api/event-category/:id`

`id` berupa **UUID**. Semua field opsional.

### Request Body

```json
{
  "event_id": "550e8400-e29b-41d4-a716-446655440010",
  "name": "Kategori Dewasa (Updated)",
  "price": 200000,
  "max_participant": 60,
  "description": "Deskripsi baru"
}
```

### Response

```json
{
  "status": 200,
  "message": "Event category updated successfully",
  "data": { ... }
}
```

---

## 📌 Delete Event Category

**DELETE** `/api/event-category/:id`

### Response

```json
{
  "status": 200,
  "message": "Event category deleted successfully",
  "data": {
    "message": "Event category deleted successfully"
  }
}
```

---

## 🔐 Permissions

| Endpoint                    | Permission           |
| -------------------------- | -------------------- |
| `GET /api/event-category`  | `event_category:read` |
| `GET /api/event-category/:id` | `event_category:read` |
| `POST /api/event-category` | `event_category:create` |
| `PATCH /api/event-category/:id` | `event_category:update` |
| `DELETE /api/event-category/:id` | `event_category:delete` |

---

## ⚠️ Error Responses

### Not Found (404)

```json
{
  "status": 404,
  "message": "Event category not found"
}
```
