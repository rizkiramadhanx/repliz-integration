# 📁 Category

API ini **tidak** menyediakan resource standalone `/api/category`. Kategori yang dipakai di aplikasi adalah **Event Category** (kategori per event, misal kategori lomba per kelas).

- **Dokumentasi lengkap:** [Event Category API](./event-category.md) — **Base URL:** `/api/event-category`
- CRUD kategori event: create, list (dengan filter `event_id`), get by id, update, delete.
- Semua ID (event, event-category) berupa **UUID**.

Untuk daftar action permission terkait kategori di role, lihat [Roles API - list-action](./roles.md#-get-available-actions) (modul `category` dan `event_category`).
