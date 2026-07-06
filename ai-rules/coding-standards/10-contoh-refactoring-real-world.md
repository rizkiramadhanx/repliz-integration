# Contoh Refactoring Real-World

> **IMMUTABLE -- AI TIDAK BOLEH mengubah file ini. Baca sebagai panduan. Untuk output, lihat mapping di ai-rules/README.md.**

> **Status:** WAJIB — Bagian dari coding standards. Lihat [CODING_STANDARDS.md](../CODING_STANDARDS.md) untuk index lengkap.

### Kasus 1 — Backend: ItemController (1200+ baris, 1 controller untuk semua operasi item + stok + kategori)

**Struktur yang BENAR:**

```
src/modules/
├── items/
│   ├── items.module.ts
│   ├── items.controller.ts          (CRUD item - 180 baris)
│   ├── items.service.ts             (250 baris)
│   ├── dto/item.dto.ts
│   └── entities/item.entity.ts
├── item-stock/
│   ├── item-stock.module.ts
│   ├── item-stock.controller.ts     (mutasi stok - 120 baris)
│   ├── item-stock.service.ts        (200 baris)
│   └── entities/item-stock.entity.ts
└── categories/
    ├── categories.module.ts
    ├── categories.controller.ts     (CRUD kategori - 100 baris)
    └── categories.service.ts
```

**Hasil:**
- 1 controller 1200+ baris (item + stok + kategori tercampur) → 3 module terpisah, masing-masing < 300 baris
- Setiap module punya 1 tanggung jawab (domain terpisah, `imports` sendiri di `app.module.ts`)
- Mudah di-test per module (`items.service.spec.ts` terpisah dari `item-stock.service.spec.ts`)
- Mengikuti konvensi NestJS: 1 module = 1 domain, service akses data via `@InjectRepository`

### Kasus 2 — Frontend: page-item.tsx (800+ baris, fetch + form add + form edit + delete semua inline)

**Struktur yang BENAR:**

```
src/features/master-data/item/
├── page-item.tsx                    (180 baris - orchestration: table, filter, pagination)
├── type.ts
├── components/
│   ├── modal-add-item.tsx           (120 baris)
│   ├── modal-edit-item.tsx          (120 baris)
│   └── modal-detail-item.tsx        (80 baris)
└── hooks/
    ├── useGetAllItem.tsx
    ├── useGetItemDetail.tsx
    ├── useMutateAddItem.tsx
    ├── useMutateEditItem.tsx
    └── useMutateDeleteItem.tsx
```

**Hasil:**
- 1 page 800+ baris (fetch logic + 2 form inline + delete handler) → 1 page ramping + 3 modal component + 5 hook data-fetching
- Fetch/mutation logic pindah ke hook — page tidak lagi punya `useEffect` manual atau `axios` langsung
- Form add/edit terisolasi, gampang diuji dan diubah tanpa menyentuh page utama
- Mengikuti konvensi project: feature-based folder, 1 hook = 1 operasi (lihat [05](./05-framework-specific-guidelines.md))

---

Kembali ke [Index](../CODING_STANDARDS.md)
