# API / Request Flow Architecture

> **Status:** DATA FILE — AI WAJIB mengupdate saat ada perubahan desain sistem.
> **Purpose:** Dokumentasi flow request dari client ke response, mencakup semua layer.

---

## IMMUTABLE -- AI TIDAK BOLEH MENGUBAH FILE INI. Baca template ini, lalu BUAT file BARU di folder output (dev-docs/, planning/, dll) -- JANGAN ubah template ini.

**What to CREATE in output folder:** Dokumentasikan bagaimana request mengalir di sistem. Project ini fullstack: backend NestJS (`backend/`) + frontend React/Vite (`frontend/`), 2 flow terpisah.

**When to update:**
- Saat ada perubahan interceptor/guard pipeline
- Saat ada perubahan request handling pattern
- Saat ada API baru yang signifikan
- Saat ada perubahan import/export pipeline

---

## Web Request Flow

```
[Browser] → [Vite dev server / Nginx (build statis)] → [React Router] → [Page Component] → [TanStack Query Hook] → [axiosInstanceAPI] → [NestJS: Guard (JWT + Permissions)] → [Controller] → [Service] → [TypeORM Repository] → [PostgreSQL] → [JSON Response] → [React Query cache] → [Render]
```

---

## API Flow (Frontend ↔ Backend)

**Dokumentasikan flow request dari frontend ke backend API:**
- Frontend memanggil API lewat `axiosInstanceAPI` (`frontend/src/libs/axios.ts`), dibungkus hook `useQuery`/`useMutation` per fitur (`frontend/src/features/{group}/{feature}/hooks/`)
- Auth token dikirim via header `Authorization: Bearer {token}` — cek interceptor di `axios.ts`
- Endpoint pattern: `/api/{resource}` (mis. `/api/role`, `/api/item`), 1 `@Controller('{resource}')` NestJS per resource

---

## Mutation Flow (Create/Update/Delete)

**Dokumentasikan flow mutasi data:**
- Form submission → modal component (`components/modal-add-{feature}.tsx`) → `useMutate{Action}{Feature}` hook → POST/PATCH/DELETE ke backend
- Validasi terjadi di 2 sisi: frontend (`@mantine/form` rules) dan backend (DTO + `class-validator`) — backend adalah source of truth
- Transaction DB (jika multi-step) ditangani di Service via `DataSource.transaction()` (TypeORM)
- Error ditangkap di Controller (`try/catch`) → response wrapper `createErrorResponse` → frontend tampilkan via `notifications.show()` (Mantine)
- Setelah sukses: `refetch()` query terkait + `notifications.show()` sukses

---

## Import Flow (Special Pipeline, jika ada)

**Dokumentasikan flow import data (jika ada):**
- Bagaimana file upload ditangani? (multipart, validasi MIME/size — lihat `ai-rules/security/part-d-input-validation-output-sanitization.md`)
- Apakah pakai queue (Bull/BullMQ) untuk proses async?
- Bagaimana chunking/large file handling?
- Bagaimana error reporting ke user?

---

## Debug Flow (Local Environment)

**Dokumentasikan tool/cara debugging:**
- Backend: NestJS `LoggingInterceptor` (`backend/src/common/interceptors/logging.interceptor.ts`), `console.error` di controller catch block
- Frontend: React DevTools, TanStack Query DevTools
- Bagaimana log diakses (file log, `LogsModule`/`logs.service.ts`, atau stdout container)?
- Tools tambahan yang terpasang
