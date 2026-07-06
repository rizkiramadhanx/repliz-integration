# Backend Structure

> **Status:** DATA FILE — AI WAJIB mengupdate saat ada perubahan struktur backend.
> **Purpose:** Dokumentasi struktur direktori backend, organisasi controller, service layer, middleware, dan command.

---

## IMMUTABLE -- AI TIDAK BOLEH MENGUBAH FILE INI. Baca template ini, lalu BUAT file BARU di folder output (dev-docs/, planning/, dll) -- JANGAN ubah template ini.

**What to CREATE in output folder:** Mapping direktori `backend/src/` dan penjelasan peran setiap komponen. Ini adalah "peta harta karun" untuk navigasi kode backend NestJS.

**When to update:**
- Saat ada module baru di `src/modules/`
- Saat ada reorganisasi struktur
- Saat ada guard/interceptor/cron baru yang signifikan

---

## Top-Level Backend Layout

| Path | Role |
|------|------|
| `backend/src/modules/{feature}/` | 1 folder = 1 module NestJS (controller + service + dto + entities) |
| `backend/src/common/guards/` | Guard lintas module (mis. `module-access.guard.ts`) |
| `backend/src/common/decorators/` | Custom decorator (mis. `@Permissions`, `@CurrentUser`) |
| `backend/src/common/interceptors/` | Interceptor global (mis. `logging.interceptor.ts`) |
| `backend/src/common/dto/` | DTO reusable lintas module (mis. `pagination.dto.ts`) |
| `backend/src/common/type/` | Type/response wrapper bersama (`response.ts`) |
| `backend/src/security/` | Decorator terkait auth/current user (`user.decorator.ts`) |
| `backend/src/config/` | Konfigurasi (database, JWT, TypeORM) |
| `backend/src/database/` | `database.module.ts` — setup koneksi |
| `backend/src/migration/` | TypeORM migration files |
| `backend/src/seeder/` | Seeder data awal (roles, users, dll) |
| `backend/src/constant/` | Konstanta bersama (mis. `action-roles.ts`) |
| `backend/src/app.module.ts` | Root module — aggregator semua module fitur |

---

## Module Organization (WAJIB — lihat [ai-rules/coding-standards/05](../coding-standards/05-framework-specific-guidelines.md))

Setiap fitur = 1 module di `backend/src/modules/{feature}/`:
```
{feature}/
├── {feature}.module.ts
├── {feature}.controller.ts
├── {feature}.service.ts
├── {feature}.service.spec.ts
├── dto/{feature}.dto.ts
└── entities/{feature}.entity.ts
```

- Tidak ada base controller — tiap controller `@Controller('{resource}')` mandiri
- Tidak ada Resource Controller otomatis (bukan Laravel) — method CRUD didefinisikan manual dengan decorator `@Get()/@Post()/@Patch()/@Delete()`

---

## Service Layer Usage

- **Selalu ada service layer** — business logic TIDAK boleh di controller (lihat [04-separation-of-concerns.md](../coding-standards/04-separation-of-concerns.md))
- Pola: `@Injectable()` Service + `@InjectRepository(Entity)` TypeORM Repository — bukan custom Repository class terpisah
- Dependency injection lewat constructor NestJS (built-in DI container)

---

## Guards and Security

| Guard | Purpose | Applied To |
|-----------------|---------|-----------|
| `JwtAuthGuard` | Validasi JWT token | Semua controller yang butuh auth (`@UseGuards(JwtAuthGuard, ...)`) |
| `PermissionsGuard` | Cek permission user via `@Permissions('{module}:{action}')` | Bersama `JwtAuthGuard` di controller level |
| `ModuleAccessGuard` | Cek akses ke module tertentu (`common/guards/module-access.guard.ts`) | Sesuai kebutuhan module |

---

## Cron / Scheduled Task Architecture

**Dokumentasikan cron job (`@nestjs/schedule`, lihat `logs.cron.ts` sebagai contoh):**

| Cron Class | Purpose | Schedule |
|---------|---------|----------|
| `{nama_cron_class}` | `{tujuan}` | `{cron expression}` |
