# Dashboard API Documentation

**Base URL:** `/api/dashboard`

Dashboard endpoints for aggregated counts (users, events, registrations). All endpoints require **JWT authentication** and one of: `dashboard:read`, `user:read`, `event:read`, or `registration_event:read` (depending on the endpoint).

---

## Get Users Count

**GET** `/api/dashboard/users/count`

Returns the total number of users.

**Permissions:** `dashboard:read` or `user:read`

### Response

```json
{
  "message": "OK",
  "code": 200,
  "status": "success",
  "data": {
    "count": 42
  }
}
```

---

## Get Events Count

**GET** `/api/dashboard/events`

Returns event counts grouped by time: past, all, and upcoming.

**Permissions:** `dashboard:read` or `event:read`

### Response

```json
{
  "message": "OK",
  "code": 200,
  "status": "success",
  "data": {
    "past": 5,
    "all": 12,
    "upcoming": 7
  }
}
```

| Field     | Type   | Description                                      |
| --------- | ------ | ------------------------------------------------- |
| past      | number | Events with `date < now` (already passed)        |
| all       | number | Total number of events                           |
| upcoming  | number | Events with `date >= now` (future or today)      |

---

## Get Registration Stats

**GET** `/api/dashboard/registrations`

Returns registration counts by status: pending, rejected, expired, paid (and total). Optionally filter by event via `event_id` query.

**Permissions:** `dashboard:read` or `registration_event:read`

### Query Parameters

| Parameter  | Type   | Required | Description                                                                 |
| ---------- | ------ | -------- | --------------------------------------------------------------------------- |
| event_id   | string (UUID) | No       | If provided, counts only registrations whose category belongs to this event |

### Example: All registrations

**GET** `/api/dashboard/registrations`

### Example: Registrations for one event

**GET** `/api/dashboard/registrations?event_id=550e8400-e29b-41d4-a716-446655440000`

### Response

```json
{
  "message": "OK",
  "code": 200,
  "status": "success",
  "data": {
    "pending": 10,
    "rejected": 2,
    "expired": 5,
    "paid": 20,
    "total": 37
  }
}
```

| Field    | Type   | Description                          |
| -------- | ------ | ------------------------------------ |
| pending  | number | Registrations with status PENDING     |
| rejected | number | Registrations with status REJECTED   |
| expired  | number | Registrations with status EXPIRED    |
| paid     | number | Registrations with status PAID       |
| total    | number | Sum of all status counts              |

---

## Option list access

Option actions are attached to the existing list endpoints for dropdowns:

| List                | Endpoint                    | Attached permission              |
| ------------------- | --------------------------- | -------------------------------- |
| List users          | **GET** `/api/user`         | `user:read`, `option:user`       |
| List events         | **GET** `/api/event`        | `event:read`, `option:event`     |
| List event categories | **GET** `/api/event-category` | `event_category:read`, `option:event`, `option:event_category` |

Actions: **`option:user`** (user list), **`option:event`** (event list), **`option:event_category`** (event-category list). Use the same request/response as in the respective API docs.
