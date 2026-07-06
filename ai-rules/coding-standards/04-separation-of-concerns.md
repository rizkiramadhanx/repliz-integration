# Separation of Concerns

> **IMMUTABLE -- AI TIDAK BOLEH mengubah file ini. Baca sebagai panduan. Untuk output, lihat mapping di ai-rules/README.md.**

> **Status:** WAJIB — Bagian dari coding standards. Lihat [CODING_STANDARDS.md](../CODING_STANDARDS.md) untuk index lengkap.

### Layer Architecture (WAJIB — Backend NestJS)

Setiap module NestJS HARUS mengikuti layer architecture:

```
HTTP Request
    ↓
Controller (HTTP layer only)
    ↓
Service (Business logic)
    ↓
TypeORM Repository (Database operations, via @InjectRepository)
    ↓
Entity (Data structure)
```

### Controller Responsibilities

**Controller HANYA boleh:**
- ✅ Receive HTTP request
- ✅ Validate input (gunakan DTO + `class-validator`)
- ✅ Call Service layer
- ✅ Return HTTP response (via response wrapper `createSuccessResponse`/`createErrorResponse`)

**Controller TIDAK boleh:**
- ❌ Business logic
- ❌ Query TypeORM repository langsung
- ❌ File operations
- ❌ External API calls
- ❌ Complex calculations

### Service Responsibilities

**Service boleh:**
- ✅ Business logic
- ✅ Orchestrate multiple repositories/service lain
- ✅ Call external services
- ✅ Complex calculations

**Service TIDAK boleh:**
- ❌ HTTP request/response handling (`@Res`, status code)
- ❌ Terima/return `Request`/`Response` Express — hanya data plain

### Frontend — Layer Setara (React)

```
UI Event (klik, submit form)
    ↓
Page/Component (render + call hook)
    ↓
Hook (useQuery/useMutation — data fetching)
    ↓
axiosInstanceAPI (HTTP client)
```

**Page/Component HANYA boleh:** render UI, kelola state lokal (filter, modal open/close), panggil hook.
**Page/Component TIDAK boleh:** panggil `axios`/`fetch` langsung, taruh logic transformasi data kompleks inline.
**Hook HANYA boleh:** request HTTP via `axiosInstanceAPI`, define `queryKey`/mutation — bukan tempat render JSX atau state UI.

---

Kembali ke [Index](../CODING_STANDARDS.md)
