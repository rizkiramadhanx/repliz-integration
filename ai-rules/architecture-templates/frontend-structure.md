# Frontend Structure

> **Status:** DATA FILE — AI WAJIB mengupdate saat ada perubahan struktur frontend.
> **Purpose:** Dokumentasi struktur frontend: rendering, layout, komponen, dependency, asset pipeline.

---

## IMMUTABLE -- AI TIDAK BOLEH MENGUBAH FILE INI. Baca template ini, lalu BUAT file BARU di folder output (dev-docs/, planning/, dll) -- JANGAN ubah template ini.

**What to CREATE in output folder:** Peta frontend — bagaimana UI diorganisir, dirender, dan dibangun. AI harus bisa menemukan dan memodifikasi komponen UI dengan memahami struktur ini. Frontend project ini: **React 19 + Vite + TypeScript, SPA (Single Page Application)**.

**When to update:**
- Saat ada feature baru di `src/features/`
- Saat ada perubahan struktur layout/komponen
- Saat ada dependency frontend baru
- Saat ada perubahan build pipeline

---

## Rendering Model

- **SPA murni** — tidak ada SSR. Semua route di-render client-side via `react-router` (`BrowserRouter` + `useRoutes`, lihat `src/routes/index.tsx`)
- Data dikirim dari backend ke frontend lewat REST API (JSON) yang di-fetch via TanStack Query — bukan server-rendered props

---

## Layout Architecture

| Path | Purpose |
|------|---------|
| `frontend/src/components/layout/dashboard-layout.tsx` | Layout utama halaman setelah login (Sidebar + Topbar + content) |
| `frontend/src/components/layout/protected-layout.tsx` | Wrapper cek auth — redirect ke login jika belum authenticated |
| `frontend/src/components/layout/guest-layout.tsx` | Layout untuk halaman publik (login, register) |
| `frontend/src/components/layout/Sidebar.tsx` / `Topbar.tsx` | Komponen navigasi utama |
| `frontend/src/components/layout/Provider.tsx` | Wrapper provider global (Mantine, React Query, dll) |
| `frontend/src/components/moleculs/` | Komponen reusable lintas fitur (mis. `ModalDeleteConfirmation`, `PaginationTotal`) |

---

## Page Organization (Feature-Based — WAJIB, lihat [ai-rules/coding-standards/03](../coding-standards/03-view-ui-organization.md))

- Halaman diorganisir **per fitur**, bukan per jenis file: `frontend/src/features/{group}/{feature}/`
- Setiap fitur: `page-{feature}.tsx` (halaman utama) + `type.ts` + `components/` (modal add/edit) + `hooks/` (data-fetching)
- Navigasi/sidebar didefinisikan di `src/enum/sidebar.tsx` dan `src/enum/routes.ts`, dirender oleh `Sidebar.tsx`
- Routing per group didefinisikan di `src/routes/{group}.tsx`, digabung di `src/routes/index.tsx` (lihat [ai-rules/coding-standards/02](../coding-standards/02-route-organization.md))

---

## Frontend Dependencies

| Dependency | Use |
|-----------|-----|
| `@mantine/core` | UI component library utama (Table, Modal, Button, Input, dll) — WAJIB dipakai, jangan bikin komponen custom yang sudah tersedia |
| `@mantine/form` | Form handling + validasi di sisi client |
| `@mantine/notifications` | Notifikasi sukses/error (`notifications.show()`) |
| `@tanstack/react-query` | Data fetching, caching, mutation (`useQuery`/`useMutation`) |
| `axios` | HTTP client, dibungkus `src/libs/axios.ts` (`axiosInstanceAPI`) |
| `react-router` | Routing SPA |
| `dayjs` | Formatting tanggal (`src/libs/dayjs.ts`) |
| `react-icons` | Icon set |

> Cek `frontend/package.json` untuk versi aktual dan dependency tambahan.

---

## Asset Pipeline

- Build tool: **Vite** (`vite.config.ts`)
- Source file: `frontend/src/`
- Output build: `frontend/dist/` (via `npm run build` → `tsc -b && vite build`)
- Hot reload development: `npm run dev` (Vite dev server, HMR built-in)
- Styling: Mantine theme (`src/styles/theme.ts`) + Emotion (CSS-in-JS, lihat `emotion.d.ts`)
