# Views — {Nama Modul}

> **IMMUTABLE -- AI TIDAK BOLEH mengubah file ini. Baca sebagai panduan. Untuk output, lihat mapping di ai-rules/README.md.**

> **Status:** DATA FILE — Update saat page component atau komponen frontend berubah.

---

## Page & Component Registry

| File | Purpose | Dependencies |
|------|---------|-------------|
| `page-{nama-modul}.tsx` | Halaman utama (list + filter + pagination) | Mantine `Table`, `Pagination`, `Input`, TanStack Query hooks |
| `components/modal-add-{nama-modul}.tsx` | Modal form tambah data | Mantine `Modal`, form state |
| `components/modal-edit-{nama-modul}.tsx` | Modal form edit data | Mantine `Modal`, form state |
| `components/modal-delete-confirmation.tsx` (shared) | Modal konfirmasi hapus | `@/components/moleculs/modal/modal-delete-confirmation` |

**Contoh nyata:** lihat `frontend/src/features/master-data/role/page-role.tsx` (`PageRole`) — pola standar: state filter (`keyword`, `page`, `limit`) + `useDebounceCallback` untuk search, data via hook `useGetAll{Nama}(filter)`, render `Table` Mantine dengan state `isLoading` / `isSuccess` / empty state, aksi Edit/Hapus membuka modal terkait, notifikasi sukses/error via `notifications.show()` dari `@mantine/notifications`.

---

## Mantine Components Used

| Component | Purpose |
|-----------|---------|
| `Table` / `Table.ScrollContainer` | Menampilkan list data |
| `Pagination` + `PaginationTotal` (shared moleculs) | Navigasi halaman |
| `Modal` | Form add/edit & konfirmasi delete |
| `Input` (leftSection icon) | Search/filter |
| `Button`, `Group`, `Flex`, `Box`, `Text` | Layout & aksi |
| `notifications` (`@mantine/notifications`) | Toast sukses/error |

---

## Hooks (TanStack Query)

| File / Hook | Purpose |
|-------------|---------|
| `hooks/useGetAll{Nama}.ts` | `useQuery` — fetch list data + pagination/keyword filter |
| `hooks/useMutateCreate{Nama}.ts` | `useMutation` — create data |
| `hooks/useMutateUpdate{Nama}.ts` | `useMutation` — update data |
| `hooks/useMutateDelete{Nama}.ts` | `useMutation` — delete data |

---

## Type Definitions

| File | Contents |
|------|----------|
| `type.ts` | `typeData{Nama}` (bentuk response API) + tipe payload create/update |
