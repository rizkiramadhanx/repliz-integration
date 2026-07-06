# 📋 Logs API Documentation

**Base URL:** `/api/log`

API untuk melihat log aktivitas (action, user, status). Semua endpoint memerlukan **autentikasi JWT** dan permission **`log:read`**. ID log berupa **UUID**.

---

## 📌 Get All Logs

**GET** `/api/log`

Daftar log dengan paginasi dan filter (action, user_id, status).

### Query Parameters

| Parameter | Tipe          | Default | Keterangan                                      |
| --------- | ------------- | ------- | ----------------------------------------------- |
| `page`    | number        | 1       | Halaman                                         |
| `limit`   | number        | 10      | Jumlah per halaman                              |
| `keyword` | string        | -       | (reserved, bisa dipakai untuk search)           |
| `action`  | string        | -       | Filter action (partial match, case-insensitive) |
| `user_id` | string (UUID) | -       | Filter by user ID                               |
| `status`  | string        | -       | Filter status (exact, e.g. SUCCESS, ERROR)      |

### Example

```
GET /api/log?page=1&limit=10
GET /api/log?action=event:read
GET /api/log?user_id=550e8400-e29b-41d4-a716-446655440000
GET /api/log?status=SUCCESS
```

### Headers

```
Authorization: Bearer <access_token>
```

### Response

```json
{
  "status": "success",
  "code": 200,
  "message": "Get all logs success",
  "data": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440099",
      "action": "event:read",
      "userId": "550e8400-e29b-41d4-a716-446655440000",
      "timestamp": "2025-09-19T10:30:00.000Z",
      "status": "SUCCESS",
      "statusCode": "200",
      "user": {
        "id": "550e8400-e29b-41d4-a716-446655440000",
        "name": "John Doe",
        "email": "john@example.com"
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

## 📌 Get Log By ID

**GET** `/api/log/:id`

Detail satu log berdasarkan ID (UUID).

### Example

```
GET /api/log/550e8400-e29b-41d4-a716-446655440099
```

### Headers

```
Authorization: Bearer <access_token>
```

### Response

```json
{
  "status": "success",
  "code": 200,
  "message": "Get log success",
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440099",
    "action": "event:read",
    "userId": "550e8400-e29b-41d4-a716-446655440000",
    "timestamp": "2025-09-19T10:30:00.000Z",
    "status": "SUCCESS",
    "statusCode": "200",
    "user": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "name": "John Doe",
      "email": "john@example.com"
    }
  }
}
```

---

## 🔐 Permissions Required

| Endpoint           | Permission |
| ------------------ | ---------- |
| `GET /api/log`     | `log:read` |
| `GET /api/log/:id` | `log:read` |

Role harus memiliki action **`log:read`** (dapat di-assign lewat [Roles API - list-action](./roles.md#-get-available-actions)).

---

## ⚠️ Error Responses

### Unauthorized (401)

```json
{
  "status": "error",
  "code": 401,
  "message": "Unauthorized",
  "data": null
}
```

### Forbidden (403) – tidak punya permission

```json
{
  "status": "error",
  "code": 403,
  "message": "Forbidden resource",
  "data": null
}
```

### Not Found (404)

```json
{
  "status": "error",
  "code": 404,
  "message": "Log not found",
  "data": null
}
```

---

## 📋 Field Keterangan

| Field      | Tipe           | Keterangan                                     |
| ---------- | -------------- | ---------------------------------------------- |
| id         | string (UUID)  | ID log                                         |
| action     | string         | Nama action (e.g. `user:read`, `event:create`) |
| userId     | string \| null | ID user yang melakukan aksi                    |
| timestamp  | string (ISO)   | Waktu aksi                                     |
| status     | string         | SUCCESS / ERROR                                |
| statusCode | string \| null | HTTP status code (e.g. 200, 404)               |
| user       | object \| null | Data user (id, name, email) jika ada           |

Log dibuat otomatis oleh sistem saat user melakukan aksi (login, CRUD user, event, role, dll.). Endpoint ini hanya untuk **membaca** log, tidak ada create/update/delete via API.
