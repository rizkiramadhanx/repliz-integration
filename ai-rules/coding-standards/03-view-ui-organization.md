# View/UI Organization

> **IMMUTABLE -- AI TIDAK BOLEH mengubah file ini. Baca sebagai panduan. Untuk output, lihat mapping di ai-rules/README.md.**

> **Status:** WAJIB — Bagian dari coding standards. Lihat [CODING_STANDARDS.md](../CODING_STANDARDS.md) untuk index lengkap.

### Prinsip Dasar

- **1 page file = 1 feature/page** (maksimal 500 baris)
- Page **WAJIB** dipecah ke `components/` untuk section yang reusable atau panjang
- Setiap component harus punya **1 tanggung jawab**
- Jika page mendekati 500 baris, **WAJIB** extract ke component

### React (Vite) — Feature-Based

```
src/features/master-data/item/
├── page-item.tsx                    (200 baris - main page: table + filter + pagination)
├── type.ts                          (semua type fitur ini)
├── components/
│   ├── modal-add-item.tsx           (120 baris - form tambah, section-per-field)
│   ├── modal-edit-item.tsx          (120 baris - form edit)
│   └── modal-detail-item.tsx        (80 baris - detail view)
└── hooks/
    ├── useGetAllItem.tsx
    ├── useGetItemDetail.tsx
    ├── useMutateAddItem.tsx
    ├── useMutateEditItem.tsx
    └── useMutateDeleteItem.tsx
```

**Contoh page-item.tsx (orchestration only, lihat detail pola di [05](./05-framework-specific-guidelines.md)):**
```tsx
export default function PageItem() {
  const [filter, setFilter] = useState({ keyword: "", page: 1, limit: 25 });
  const { data, isLoading, refetch } = useGetAllItem(filter);
  const [openAdd, setOpenAdd] = useState(false);

  return (
    <Box px={20} py={10}>
      <Table.ScrollContainer minWidth={200}>
        <Table striped>{/* ...rows dari data.data.data... */}</Table>
      </Table.ScrollContainer>
      <ModalAddItem open={openAdd} onClose={() => setOpenAdd(false)} onSuccess={() => { setOpenAdd(false); refetch(); }} />
    </Box>
  );
}
```

**Contoh components/modal-add-item.tsx (form section dalam 1 modal, WAJIB pakai Mantine form components):**
```tsx
export default function ModalAddItem({ open, onClose, onSuccess }: Props) {
  const form = useForm<typeDataCreateItemPayload>({ initialValues: { name: "", price: 0 } });
  const { mutate, isPending } = useMutateAddItem();

  const handleSubmit = form.onSubmit((values) => {
    mutate(values, { onSuccess });
  });

  return (
    <Modal opened={open} onClose={onClose} title="Tambah Item">
      <form onSubmit={handleSubmit}>
        <TextInput label="Nama" {...form.getInputProps("name")} />
        <NumberInput label="Harga" {...form.getInputProps("price")} />
        <Button type="submit" loading={isPending}>Simpan</Button>
      </form>
    </Modal>
  );
}
```

**Aturan wajib:**
- Page component (`page-{feature}.tsx`) HANYA orkestrasi: state filter, panggil hook, render list/table
- Form tambah/edit/detail WAJIB di modal component terpisah di `components/` — jangan inline di page
- Jika 1 modal form >200 baris, pecah section field ke sub-component di `components/` (mis. `form-section-personal.tsx`)
- Semua elemen form pakai Mantine (`@mantine/core`, `@mantine/form`) — jangan bikin input/button custom yang sudah tersedia
- Component reusable lintas fitur (bukan spesifik 1 fitur) ditaruh di `src/components/moleculs/` atau `src/components/layout/`, bukan di `features/{feature}/components/`

---

Kembali ke [Index](../CODING_STANDARDS.md)
