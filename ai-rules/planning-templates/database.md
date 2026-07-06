# Database Plan — {Nama Produk}

> **IMMUTABLE -- AI TIDAK BOLEH mengubah file ini. Baca sebagai panduan. Untuk output, lihat mapping di ai-rules/README.md.**

> **Status:** PLANNING — Dibuat sebelum development. Jangan diubah tanpa diskusi.
> **Purpose:** Cetak biru database: ERD, schema, relasi, indexing strategy.

---

## 1. Database Topology

| Connection | DB Engine | Database Name | Purpose |
|-----------|----------|--------------|---------|
| `default` | PostgreSQL (TypeORM) | `{nama_db}` | Primary data |
| `{connection_2}` | `{engine}` | `{nama_db}` | `{purpose}` |

---

## 2. Entity Relationship Diagram

```text
{deskripsi tekstual ERD — bisa diganti diagram nanti}

┌─────────────┐       ┌─────────────┐
│   users     │───<   │   posts     │
├─────────────┤       ├─────────────┤
│ id (PK)     │       │ id (PK)     │
│ name        │       │ user_id (FK)│
│ email       │       │ title       │
│ created_at  │       │ body        │
└─────────────┘       └─────────────┘
```

---

## 3. Table Schemas

### `{nama_tabel}`

| Column | Type | Constraints | Index | Notes |
|--------|------|------------|-------|-------|
| `id` | `{bigint}` | PK, auto-increment | PRIMARY | |
| `{field}` | `{type}` | `{NOT NULL / nullable}` | `{INDEX / UNIQUE}` | `{catatan}` |
| `created_at` | `timestamp` | | | |
| `updated_at` | `timestamp` | | | |
| `deleted_at` | `timestamp` | nullable | | Soft delete (jika ada) |

---

## 4. Relationships Summary

| Table A | Relation (TypeORM decorator) | Table B | Foreign Key |
|---------|------------------------------|---------|-------------|
| `{tabel_a}` | `@OneToMany`/`@ManyToMany` | `{tabel_b}` | `{tabel_a}_id` |
| `{tabel_b}` | `@ManyToOne`/`@ManyToMany` | `{tabel_a}` | `{tabel_a}_id` |

---

## 5. Indexing Strategy

| Table | Index | Columns | Type | Reason |
|-------|-------|---------|------|--------|
| `{tabel}` | `{idx_name}` | `{field1, field2}` | `{BTREE / UNIQUE / FULLTEXT}` | `{alasan}` |

---

## 6. Migration Plan

**Generate via TypeORM CLI:** `npm run migration:generate -- src/migrations/{Nama}`

| # | Migration | Table | Domain | Notes |
|---|----------|-------|--------|-------|
| 1 | `CreateUsersTable` | `users` | Core | |
| 2 | `Create{Nama}Table` | `{nama}` | `{modul}` | |

---

## 7. Seed Data

**Jalankan via seed script TypeORM (`src/database/seeds/`) atau custom NestJS command.**

| Seeder | Purpose | Data Source |
|--------|---------|------------|
| `{RoleSeeder}` | Initial roles | Hardcoded |
| `{AdminSeeder}` | Default admin user | Hardcoded |
