# Participant API Documentation

**Base URL:** `/api/participant`

Participant API supports **read**, **update**, and **delete** only (no create). All endpoints require **JWT authentication** and the appropriate permission: `participant:read`, `participant:update`, or `participant:delete`. IDs and `event_category_id` are **UUIDs**.

**Field hasil assessment:** `ranking` dan `score` diisi dari **process ranking** (Assessment). Jika belum/tidak dinominasikan: keduanya `null`.

---

## Get All Participants

**GET** `/api/participant`

### Query Parameters

| Parameter           | Type          | Default | Description                    |
| ------------------- | ------------- | ------- | ------------------------------ |
| `page`              | number        | 1       | Page number                    |
| `limit`             | number        | 10      | Items per page                 |
| `keyword`           | string        | -       | Search by participant name     |
| `event_category_id` | string (UUID) | -       | Filter by event category       |
| `event_id`          | string (UUID) | -       | Filter by event (via category) |

### Example

```
GET /api/participant?page=1&limit=10&event_id=550e8400-e29b-41d4-a716-446655440000
```

### Response

```json
{
  "message": "Get all participants success",
  "code": 200,
  "status": "success",
  "data": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440050",
      "event_category_id": "550e8400-e29b-41d4-a716-446655440020",
      "name": "John Doe",
      "bird_name": "Bird One",
      "address": "Jakarta",
      "position": 1,
      "ranking": 1,
      "score": 16,
      "created_at": "2025-10-14T12:00:00.000Z",
      "updated_at": "2025-10-14T12:00:00.000Z",
      "event_category": { "id": "...", "name": "Category Name" }
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

## Get Participants by Event (grouped by event category)

**GET** `/api/participant/event/:id`

Returns participants grouped by event category for the given event `id` (event UUID). Response is an array of `{ event_category, data }`.

### Example

```
GET /api/participant/event/550e8400-e29b-41d4-a716-446655440000
```

### Response

```json
{
  "message": "Get participants by event success",
  "code": 200,
  "status": "success",
  "data": [
    {
      "event_category": { "id": "cat-uuid-1", "name": "Category A" },
      "data": [
        {
          "id": "...",
          "event_category_id": "cat-uuid-1",
          "name": "John",
          "bird_name": "Bird One",
          "address": "Jakarta",
          "position": 1,
          "ranking": 1,
          "score": 16,
          "created_at": "...",
          "updated_at": "...",
          "event_category": { "id": "cat-uuid-1", "name": "Category A" }
        }
      ]
    },
    {
      "event_category": { "id": "cat-uuid-2", "name": "Category B" },
      "data": []
    }
  ]
}
```

---

## Get One Participant

**GET** `/api/participant/:id`

### Response

```json
{
  "message": "Get participant success",
  "code": 200,
  "status": "success",
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440050",
    "event_category_id": "550e8400-e29b-41d4-a716-446655440020",
    "name": "John Doe",
    "bird_name": "Bird One",
    "address": "Jakarta",
    "position": 1,
    "ranking": 1,
    "score": 16,
    "created_at": "2025-10-14T12:00:00.000Z",
    "updated_at": "2025-10-14T12:00:00.000Z",
    "event_category": { "id": "...", "name": "Category Name" }
  }
}
```

---

## Update Participant

**PATCH** `/api/participant/:id`

### Request Body

All fields are optional. Send only the fields you want to update.

```json
{
  "event_category_id": "550e8400-e29b-41d4-a716-446655440020",
  "name": "John Doe",
  "bird_name": "Bird One",
  "address": "Jakarta",
  "position": 1
}
```

| Field               | Type          | Required | Description                |
| ------------------- | ------------- | -------- | -------------------------- |
| event_category_id   | string (UUID) | No       | Event category ID          |
| name                | string        | No       | Participant name, max 255  |
| bird_name           | string        | No       | Bird name, max 255          |
| address             | string        | No       | Address, max 500            |
| position            | number (int)  | No       | Position, min 0             |

### Response

Same shape as **Get One Participant** (updated participant with `event_category`).

---

## Delete Participant

**DELETE** `/api/participant/:id`

### Response

```json
{
  "message": "Participant deleted successfully",
  "code": 200,
  "status": "success",
  "data": {
    "message": "Participant deleted successfully"
  }
}
```
