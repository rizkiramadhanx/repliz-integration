# Controllers — {Nama Modul}

> **IMMUTABLE -- AI TIDAK BOLEH mengubah file ini. Baca sebagai panduan. Untuk output, lihat mapping di ai-rules/README.md.**

> **Status:** DATA FILE — Update saat controller baru dibuat atau method berubah.

---

## Controller Registry

| Controller | Location | Purpose |
|-----------|----------|---------|
| `{NamaController}` | `backend/src/modules/{nama-modul}/{nama-modul}.controller.ts` | `{tanggung jawab controller ini}` |

---

## Action Details

### {NamaController}

**Path:** `backend/src/modules/{nama-modul}/{nama-modul}.controller.ts`

**Decorator:** `@Controller('{prefix}')` + `@UseGuards(JwtAuthGuard, PermissionsGuard)`

| Method | Route Decorator | Permission | Purpose |
|--------|-----------------|-----------|---------|
| `all()` | `@Get()` | `@Permissions('{modul}:read')` | List data dengan pagination (`PaginationDto`) |
| `create()` | `@Post()` | `@Permissions('{modul}:create')` | Membuat data baru dari `CreateDto` |
| `detail()` | `@Get(':id')` | `@Permissions('{modul}:read')` | Detail satu data by `id` (`ParseUUIDPipe`) |
| `update()` | `@Patch(':id')` | `@Permissions('{modul}:update')` | Update data by `id` dari `UpdateDto` |
| `remove()` | `@Delete(':id')` | `@Permissions('{modul}:delete')` | Hapus data by `id` |

**Contoh nyata:** lihat `backend/src/modules/roles/roles.controller.ts` (`RolesController`) — pola standar CRUD module ini: setiap action dibungkus `try/catch`, log via `LogsService.createLog()`, response via `createSuccessResponse()` / `createErrorResponse()`, dan `@Res({ passthrough: true }) res: Response` untuk set status code manual.

---

## DTO Classes (pengganti Form Request)

| DTO | Location | Validation |
|-----|----------|-----------|
| `Create{Nama}Dto` | `backend/src/modules/{nama-modul}/dto/{nama-modul}.dto.ts` | `{ringkasan class-validator decorator, contoh: @IsString(), @IsNotEmpty()}` |
| `Update{Nama}Dto` | `backend/src/modules/{nama-modul}/dto/{nama-modul}.dto.ts` | `{biasanya PartialType(Create{Nama}Dto)}` |

---

## Controller Dependencies

| Dependency | Via | Purpose |
|-----------|-----|---------|
| `{NamaModul}Service` | Constructor injection (`private readonly xService: XService`) | Business logic & akses data |
| `LogsService` | Constructor injection | Mencatat audit log tiap action (`logsService.createLog()`) |
| `JwtAuthGuard` / `PermissionsGuard` | `@UseGuards()` di level controller | Autentikasi & otorisasi berbasis permission |
