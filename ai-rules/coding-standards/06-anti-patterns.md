# Anti-Patterns

> **IMMUTABLE -- AI TIDAK BOLEH mengubah file ini. Baca sebagai panduan. Untuk output, lihat mapping di ai-rules/README.md.**

> **Status:** WAJIB — Bagian dari coding standards. Lihat [CODING_STANDARDS.md](../CODING_STANDARDS.md) untuk index lengkap.

### 1. God Controller

```typescript
// ❌ SALAH: Controller 1000+ baris, semua logic inline
@Controller('item')
export class ItemController {
  @Post()
  async store(@Body() body: any) {
    // Validation manual (100 lines)
    // Business logic (200 lines)
    // Query TypeORM langsung (150 lines)
    // File upload handling (100 lines)
    // Notification (80 lines)
  }
}
```

**Solusi:** Extract ke Service, gunakan DTO untuk validasi, pisahkan concern ke module lain jika beda domain.

### 2. Fat Entity

```typescript
// ❌ SALAH: Entity dengan business logic
@Entity()
export class ItemEntity {
  calculateDiscountedPrice() {
    // 50 baris perhitungan diskon
  }

  generateReport() {
    // 100 baris report generation
  }
}
```

**Solusi:** Pindahkan business logic ke Service class. Entity hanya berisi kolom + relasi.

### 3. Nested Conditionals

```typescript
// ❌ SALAH: Deep nesting
function process(data: ProcessInput) {
  if (data.type === 'A') {
    if (data.status === 'active') {
      if (data.amount > 1000) {
        // logic
      }
    }
  }
}

// ✅ BENAR: Early return
function process(data: ProcessInput) {
  if (data.type !== 'A') return;
  if (data.status !== 'active') return;
  if (data.amount <= 1000) return;
  // logic
}
```

### 4. Magic Numbers

```typescript
// ❌ SALAH
if (item.type === 1) {
  price = base * 1.5;
}

// ✅ BENAR
const ITEM_TYPE_PREMIUM = 1;
const PRICE_MULTIPLIER_PREMIUM = 1.5;

if (item.type === ITEM_TYPE_PREMIUM) {
  price = base * PRICE_MULTIPLIER_PREMIUM;
}
```

### 5. Direct Fetch di Component (Frontend)

```tsx
// ❌ SALAH: fetch langsung + state manual di komponen
function PageItem() {
  const [items, setItems] = useState([]);
  useEffect(() => {
    fetch('/api/item').then((res) => res.json()).then(setItems);
  }, []);
}

// ✅ BENAR: lewat hook useQuery
function PageItem() {
  const { data } = useGetAllItem({ page: 1, limit: 25 });
}
```

---

Kembali ke [Index](../CODING_STANDARDS.md)
