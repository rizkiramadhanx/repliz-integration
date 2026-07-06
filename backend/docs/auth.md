# 🔐 Auth API Documentation

**Base URL:** `/api/auth`

Module autentikasi untuk login, register, refresh token, dan verifikasi email.

---

## 📌 Register User

**POST** `/api/auth/register`

### Request Body

```json
{
  "email": "user@example.com",
  "username": "johndoe",
  "password": "Password123!"
}
```

| Field    | Tipe   | Wajib | Keterangan        |
| -------- | ------ | ----- | ------------------ |
| email    | string | ✅    | Email (unik)       |
| username | string | ✅    | Min 3, max 50 char |
| password | string | ✅    | Min 8 karakter     |

### Response

```json
{
  "status": 200,
  "message": "register user succes"
}
```

---

## 📌 Login User

**POST** `/api/auth/login`

### Request Body

```json
{
  "email": "user@example.com",
  "password": "Password123!"
}
```

### Response

```json
{
  "status": 200,
  "message": "Login Success",
  "data": {
    "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refresh_token": "...",
    "user": { ... }
  }
}
```

**Note:** Refresh token dikirim di response body; untuk refresh bisa kirim `refresh_token` di body.

---

## 📌 Refresh Token

**POST** `/api/auth/refresh`

### Request Body

```json
{
  "refresh_token": "<refresh_token_dari_login>"
}
```

### Response

```json
{
  "status": 200,
  "message": "Token refreshed",
  "data": {
    "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

---

## 📌 Logout User

**POST** `/api/auth/logout`

### Headers

```
Authorization: Bearer <access_token>
```

### Response

```json
{
  "status": 200,
  "message": "Logged out successfully"
}
```

---

## 📌 Get User Profile

**GET** `/api/auth/profile`

### Headers

```
Authorization: Bearer <access_token>
```

### Response

```json
{
  "status": 200,
  "message": "Get profile success",
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "user@example.com",
    "name": "johndoe",
    "is_confirmed": true,
    "created_at": "2025-09-19T08:26:46.000Z",
    "updated_at": "2025-09-19T08:26:46.000Z",
    "role_id": "550e8400-e29b-41d4-a716-446655440001",
    "event_id": null,
    "role": {
      "id": "550e8400-e29b-41d4-a716-446655440001",
      "name": "Admin",
      "actions": ["role:create", "role:read", "user:read", ...]
    }
  }
}
```

---

## 📌 Verify Email

**POST** `/api/auth/verify`

### Request Body

```json
{
  "token": "verification_token_from_email"
}
```

### Response

```json
{
  "status": 200,
  "message": "succes verified email"
}
```

---

## 📌 Resend Verification Email

**POST** `/api/auth/resend/verify`

### Headers

```
Authorization: Bearer <access_token>
```

### Response

```json
{
  "status": 200,
  "message": "Verification email sent"
}
```

---

## 🛡️ Auth & Middleware

- **Register, Login, Verify**: Tidak memerlukan autentikasi
- **Refresh Token**: Memerlukan body `refresh_token`
- **Profile, Logout, Resend Verify**: Memerlukan JWT Bearer Token

---

## ⚠️ Error Responses

### Unauthorized (401)

```json
{
  "status": 401,
  "message": "Invalid credentials"
}
```

### Conflict (409)

```json
{
  "status": 409,
  "message": "Email already in use"
}
```

### Bad Request (400)

```json
{
  "status": 400,
  "message": "Invalid verification token"
}
```

---

## 📋 Business Rules

1. **Email Uniqueness**: Email harus unik dalam sistem
2. **Password Strength**: Password minimal 8 karakter
3. **Email Verification**: User harus verifikasi email sebelum dapat login (kecuali development)
4. **Register**: User pertama mendapat role Admin dengan semua actions
