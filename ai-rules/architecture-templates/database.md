# Database Architecture

> **Status:** DATA FILE — AI WAJIB mengupdate saat ada perubahan skema database.
> **Purpose:** Dokumentasi arsitektur database: koneksi, migrasi, relasi, storage.

---

## IMMUTABLE -- AI TIDAK BOLEH MENGUBAH FILE INI. Baca template ini, lalu BUAT file BARU di folder output (dev-docs/, planning/, dll) -- JANGAN ubah template ini.

**What to CREATE in output folder:** Peta database — koneksi, skema, migrasi, pola relasi, storage. AI harus bisa memahami struktur data hanya dari dokumen ini. Backend project ini pakai **TypeORM** (lihat `backend/src/config/typeorm.config.ts`, `backend/src/config/database.config.ts`).

**When to update:**
- Saat ada entity baru di `backend/src/modules/{feature}/entities/`
- Saat ada perubahan skema signifikan
- Saat ada migration baru di `backend/src/migration/`
- Saat ada perubahan storage/policy

---

## Connection Map

| Connection | Driver | Host | Schema / Database | Notes |
|-----------|--------|------|-------------------|-------|
| `default` | `postgres` (TypeORM — lihat `TypeOrmModule.forRootAsync` di `database.module.ts`) | `{DB_HOST dari .env}` | `{DB_NAME dari .env}` | Config di `backend/src/config/database.config.ts` |

---

## Migration Layout

| Path | Domain |
|------|--------|
| `backend/src/migration/` | Semua migration TypeORM, penamaan `{timestamp}-{deskripsi}.ts` (mis. `1772767263588-init.ts`) |

---

## Entity & Relation Style

**Jelaskan bagaimana relasi antar entity ditangani:**
- Semua entity ditaruh di `backend/src/modules/{feature}/entities/{feature}.entity.ts`, di-decorate `@Entity()`
- Relasi via decorator TypeORM (`@OneToMany`, `@ManyToOne`, `@ManyToMany`) — dokumentasikan relasi antar entity utama di sini
- Registrasi entity ke module lewat `TypeOrmModule.forFeature([XxxEntity])` di `{feature}.module.ts`

---

## Storage Implications

**Dokumentasikan storage setup:**
- Di mana file upload disimpan? (local disk `backend/uploads/`, S3, atau lainnya)
- Bagaimana akses file publik vs private?
- Validasi MIME/size — lihat `ai-rules/security/part-d-input-validation-output-sanitization.md`

---

## Operational Commands

| Domain | Command | Notes |
|--------|---------|-------|
| Migrasi | `npm run migration:run` (cek script aktual di `backend/package.json`) | Dijalankan dari `backend/` |
| Generate migration | `npm run migration:generate -- src/migration/{Nama}` | TypeORM CLI |
| Revert migration | `npm run migration:revert` | Rollback 1 migration terakhir |
| Seeder | `npm run seed` (cek `backend/src/seeder/seeder-runner.ts`) | Isi data awal (roles, users) |
| Backup | `pg_dump` (lihat `ai-rules/operations/_templates/backup.md`) | Lihat `ai-rules/deployment/` |
