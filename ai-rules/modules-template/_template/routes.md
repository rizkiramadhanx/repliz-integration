# Routes — {Nama Modul}

> **IMMUTABLE -- AI TIDAK BOLEH mengubah file ini. Baca sebagai panduan. Untuk output, lihat mapping di ai-rules/README.md.**

> **Status:** DATA FILE — Update saat ada perubahan route, module registration, atau guard.

---

## Backend — NestJS Module Registration

| Item | Detail |
|------|--------|
| Module | `{Nama}Module` (`backend/src/modules/{nama-modul}/{nama-modul}.module.ts`) |
| Registered in | `backend/src/app.module.ts` → `imports: [..., {Nama}Module]` |
| Controller prefix | `@Controller('{prefix}')` |
| Guards (level controller) | `@UseGuards(JwtAuthGuard, PermissionsGuard)` |

**Contoh nyata:** lihat `backend/src/modules/roles/roles.module.ts` — module mengimpor `TypeOrmModule.forFeature([RoleEntity])` dan module lain yang di-depend (`LogsModule`), lalu mendaftarkan `controllers` dan `providers`, serta `exports` service jika dipakai module lain.

---

## Endpoint Registry

| Method | URI | Controller Method | Permission | Notes |
|--------|-----|-------------------|-----------|-------|
| `GET` | `/{prefix}` | `{NamaController}.all()` | `{modul}:read` | Support query `PaginationDto` (page, limit, keyword) |
| `POST` | `/{prefix}` | `{NamaController}.create()` | `{modul}:create` | Body `Create{Nama}Dto` |
| `GET` | `/{prefix}/:id` | `{NamaController}.detail()` | `{modul}:read` | `id` divalidasi `ParseUUIDPipe` |
| `PATCH` | `/{prefix}/:id` | `{NamaController}.update()` | `{modul}:update` | Body `Update{Nama}Dto` |
| `DELETE` | `/{prefix}/:id` | `{NamaController}.remove()` | `{modul}:delete` | |

---

## Frontend — React Router

| Item | Detail |
|------|--------|
| Route file | `frontend/src/routes/{group}.tsx` (atau file routing group terkait) |
| Path | `/{prefix}` |
| Page component | `frontend/src/features/{group}/{nama-modul}/page-{nama-modul}.tsx` |
| Guard | `{ProtectedRoute / RequirePermission wrapper, jika ada}` |

**Pola:** route didaftarkan dengan `react-router` (`createBrowserRouter` / `<Route path="/{prefix}" element={<Page{Nama} />} />`), mengarah ke default export `page-{nama-modul}.tsx` di folder feature terkait. Lihat contoh nyata struktur di `frontend/src/features/master-data/role/page-role.tsx`.

---

## Route File Location

- Backend: `backend/src/app.module.ts` (module registration) + `backend/src/modules/{nama-modul}/{nama-modul}.controller.ts` (endpoint path)
- Frontend: `frontend/src/routes/{group}.tsx`
