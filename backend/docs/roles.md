# 👑 Roles API Documentation

**Base URL:** `/api/role`

Semua endpoint memerlukan **autentikasi JWT** dan permission sesuai tabel di bawah. ID role berupa **UUID**. Role memakai **actions** (array string) untuk permission, bukan modules.

---

## 📌 Get Available Actions

**GET** `/api/role/list-action`

Daftar modul dan action yang bisa di-assign ke role.

### Response

```json
{
  "status": 200,
  "message": "Action list",
  "data": [
    {
      "name": "role",
      "actions": ["role:create", "role:read", "role:update", "role:delete"]
    },
    {
      "name": "user",
      "actions": ["user:create", "user:read", "user:update", "user:delete"]
    },
    {
      "name": "category",
      "actions": ["category:create", "category:read", "category:update", "category:delete"]
    },
    {
      "name": "event",
      "actions": ["event:create", "event:read", "event:update", "event:delete"]
    },
    {
      "name": "event_category",
      "actions": ["event_category:create", "event_category:read", "event_category:update", "event_category:delete"]
    },
    {
      "name": "registration_event",
      "actions": ["registration_event:create", "registration_event:read", "registration_event:update", "registration_event:delete"]
    }
  ]
}
```

---

## 📌 Get All Roles

**GET** `/api/role`

Paginasi dan filter nama.

### Query Parameters

| Parameter | Tipe   | Default | Keterangan                    |
| --------- | ------ | ------- | ----------------------------- |
| `page`    | number | 1       | Halaman                       |
| `limit`   | number | 10      | Jumlah per halaman            |
| `keyword` | string | -       | Filter nama role (case-insensitive) |

### Example

```
GET /api/role?page=1&limit=10&keyword=Manager
```

### Response

```json
{
  "status": 200,
  "message": "Get all roles success",
  "data": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440001",
      "name": "Admin",
      "actions": ["role:create", "role:read", "user:read", "event:read", ...],
      "created_at": "2025-09-19T08:26:46.000Z",
      "updated_at": "2025-09-19T08:26:46.000Z"
    },
    {
      "id": "550e8400-e29b-41d4-a716-446655440002",
      "name": "Manager",
      "actions": ["event:read", "event_category:read", "registration_event:read"],
      "created_at": "2025-09-19T08:27:46.000Z",
      "updated_at": "2025-09-19T08:27:46.000Z"
    }
  ],
  "meta": {
    "page": 1,
    "limit": 10,
    "total": 2,
    "total_page": 1
  }
}
```

---

## 📌 Create Role

**POST** `/api/role`

### Request Body

```json
{
  "name": "Manager",
  "actions": ["event:read", "event_category:read", "registration_event:create"]
}
```

| Field   | Tipe     | Wajib | Keterangan                          |
| ------- | -------- | ----- | ----------------------------------- |
| name    | string   | ✅    | Nama role, max 255 karakter         |
| actions | string[] | ✅    | Array action (misal `event:read`)   |

### Response

```json
{
  "status": 201,
  "message": "Role created",
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440002",
    "name": "Manager",
    "actions": ["event:read", "event_category:read", "registration_event:create"],
    "created_at": "2025-09-19T08:26:46.000Z",
    "updated_at": "2025-09-19T08:26:46.000Z"
  }
}
```

---

## 📌 Get Role Detail

**GET** `/api/role/:roleId`

`roleId` berupa **UUID**.

### Example

```
GET /api/role/550e8400-e29b-41d4-a716-446655440001
```

### Response

```json
{
  "status": 200,
  "message": "Role detail",
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440001",
    "name": "Admin",
    "actions": ["role:create", "role:read", "user:read", ...],
    "created_at": "2025-09-19T08:26:46.000Z",
    "updated_at": "2025-09-19T08:26:46.000Z"
  }
}
```

---

## 📌 Update Role

**PATCH** `/api/role/:roleId`

Semua field opsional. Role dengan nama "Admin" tidak boleh di-update (403).

### Request Body

```json
{
  "name": "Senior Manager",
  "actions": ["event:read", "event:update", "event_category:read", "registration_event:create"]
}
```

### Response

```json
{
  "status": 200,
  "message": "Role updated",
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440002",
    "name": "Senior Manager",
    "actions": ["event:read", "event:update", ...],
    "created_at": "...",
    "updated_at": "..."
  }
}
```

---

## 📌 Delete Role

**DELETE** `/api/role/:roleId`

Role dengan nama "Admin" tidak boleh dihapus (403).

### Example

```
DELETE /api/role/550e8400-e29b-41d4-a716-446655440002
```

### Response

```json
{
  "status": 200,
  "message": "Role deleted",
  "data": true
}
```

---

## 🔐 Permissions Required

| Endpoint              | Permission    |
| --------------------- | ------------- |
| `GET /api/role/list-action` | (tanpa permission) |
| `GET /api/role`       | `role:read`   |
| `POST /api/role`      | `role:create` |
| `GET /api/role/:roleId` | `role:read` |
| `PATCH /api/role/:roleId` | `role:update` |
| `DELETE /api/role/:roleId` | `role:delete` |

---

## 📋 Business Rules

1. **Admin role**: Role dengan `name === "Admin"` tidak boleh di-update maupun di-delete.
2. **Actions**: Nilai harus sesuai format `module:action` dari `GET /api/role/list-action`.

---

## ⚠️ Error Responses

### Forbidden (403)

```json
{
  "status": 403,
  "message": "Admin tidak boleh diganti"
}
```

```json
{
  "status": 403,
  "message": "Admin tidak boleh dihapus"
}
```

### Not Found (404)

```json
{
  "status": 404,
  "message": "Role not found"
}
```
