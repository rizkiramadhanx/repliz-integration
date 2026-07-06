# 👤 User API Documentation

**Base URL:** `/api/user`

Semua endpoint memerlukan **autentikasi JWT** dan permission sesuai tabel di bawah. ID user dan `role_id` berupa **UUID**.

---

## 📌 Get All Users

**GET** `/api/user`

Daftar user dengan paginasi dan filter nama.

### Query Parameters

| Parameter | Tipe   | Default | Keterangan                 |
| --------- | ------ | ------- | -------------------------- |
| `page`    | number | 1       | Halaman                    |
| `limit`   | number | 10      | Jumlah per halaman          |
| `keyword` | string | -       | Filter nama (case-insensitive) |

### Example

```
GET /api/user?page=1&limit=10&keyword=John
```

### Response

```json
{
  "status": 200,
  "message": "Get All user success",
  "data": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "name": "John Doe",
      "email": "john@example.com",
      "created_at": "2025-09-19T08:26:46.000Z",
      "updated_at": "2025-09-19T08:26:46.000Z",
      "role_id": "550e8400-e29b-41d4-a716-446655440001",
      "role": {
        "id": "550e8400-e29b-41d4-a716-446655440001",
        "name": "Admin",
        "actions": ["role:create", "role:read", "user:read", ...]
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

## 📌 Get User By ID

**GET** `/api/user/:id`

`id` berupa **UUID**.

### Example

```
GET /api/user/550e8400-e29b-41d4-a716-446655440000
```

### Response

```json
{
  "status": 200,
  "message": "Get user success",
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "John Doe",
    "email": "john@example.com",
    "is_confirmed": true,
    "created_at": "2025-09-19T08:26:46.000Z",
    "updated_at": "2025-09-19T08:26:46.000Z",
    "role_id": "550e8400-e29b-41d4-a716-446655440001",
    "event_id": null,
    "role": {
      "id": "550e8400-e29b-41d4-a716-446655440001",
      "name": "Admin",
      "actions": ["role:create", "role:read", ...]
    }
  }
}
```

---

## 📌 Create User

**POST** `/api/user`

### Request Body

```json
{
  "name": "Jane Doe",
  "email": "jane@example.com",
  "password": "Password123!",
  "confirmPassword": "Password123!",
  "role_id": 1
}
```

| Field           | Tipe   | Wajib | Keterangan               |
| --------------- | ------ | ----- | ------------------------ |
| name            | string | ✅    | Nama user                |
| email           | string | ✅    | Email (unik)             |
| password        | string | ✅    | Min 8 karakter           |
| confirmPassword | string | ✅    | Harus sama dengan password |
| role_id         | string | -     | ID role (UUID)            |

### Response

```json
{
  "status": 201,
  "message": "User created successfully",
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440002",
    "name": "Jane Doe",
    "email": "jane@example.com",
    "is_confirmed": false,
    "created_at": "2025-09-19T09:00:00.000Z",
    "updated_at": "2025-09-19T09:00:00.000Z",
    "role_id": "550e8400-e29b-41d4-a716-446655440001"
  }
}
```

---

## 📌 Update User

**PUT** `/api/user/:id`

Semua field opsional; hanya field yang dikirim yang di-update.

### Request Body

```json
{
  "name": "Jane Updated",
  "email": "jane.new@example.com",
  "password": "NewPassword123!",
  "role_id": 2
}
```

| Field    | Tipe   | Wajib | Keterangan     |
| -------- | ------ | ----- | -------------- |
| name     | string | -     | Nama user      |
| email    | string | -     | Email (unik)   |
| password | string | -     | Min 8 karakter |
| role_id  | string | -     | ID role (UUID) |

### Response

```json
{
  "status": 200,
  "message": "User updated successfully",
  "data": { ... }
}
```

---

## 📌 Delete User

**DELETE** `/api/user/:id`

### Example

```
DELETE /api/user/550e8400-e29b-41d4-a716-446655440002
```

### Response

```json
{
  "status": 200,
  "message": "User deleted successfully",
  "data": {
    "message": "User deleted successfully"
  }
}
```

---

## 🔐 Permissions Required

| Endpoint         | Permission    |
| ---------------- | ------------- |
| `GET /api/user` | `user:read`   |
| `GET /api/user/:id` | `user:read` |
| `POST /api/user` | `user:create` |
| `PUT /api/user/:id` | `user:update` |
| `DELETE /api/user/:id` | `user:delete` |

---

## ⚠️ Error Responses

### Not Found (404)

```json
{
  "status": 404,
  "message": "User not found"
}
```

### Conflict (409)

```json
{
  "status": 409,
  "message": "User with this email already exists"
}
```

### Validation (400)

```json
{
  "status": 400,
  "message": "Validation failed",
  "errors": [ ... ]
}
```
