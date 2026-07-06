# Services — {Nama Modul}

> **IMMUTABLE -- AI TIDAK BOLEH mengubah file ini. Baca sebagai panduan. Untuk output, lihat mapping di ai-rules/README.md.**

> **Status:** DATA FILE — Update saat service class atau business logic berubah.

---

## Service Registry

| Service | Location | Purpose |
|---------|----------|---------|
| `{Nama}Service` | `backend/src/modules/{nama-modul}/{nama-modul}.service.ts` | `{tanggung jawab}` |

---

## Method Details

### {Nama}Service

**Path:** `backend/src/modules/{nama-modul}/{nama-modul}.service.ts`

**Decorator:** `@Injectable()`, inject repository via `@InjectRepository({Nama}Entity) private readonly {nama}Repo: Repository<{Nama}Entity>`

| Method | Purpose | Side Effects |
|--------|---------|-------------|
| `create(dto)` | Simpan data baru via `repo.create()` + `repo.save()`, return `plainToInstance({Nama}ResponseDto, ...)` | `{event / log / email, jika ada}` |
| `list(paginationDto)` | `repo.findAndCount()` dengan `skip/take` + `ILike` untuk keyword search, return `{ data, meta }` | — |
| `detail{Nama}(id)` | `repo.findOne({ where: { id } })`, throw `NotFoundException` jika tidak ada | — |
| `update{Nama}(id, dto)` | Cari entity, `Object.assign(entity, dto)`, `repo.save()` | `{business rule guard, contoh: cegah update role Admin}` |
| `delete{Nama}(id)` | Cari entity, guard business rule, `repo.delete(id)` | `{business rule guard}` |

**Contoh nyata:** lihat `backend/src/modules/roles/roles.service.ts` (`RolesService`) — pola standar: DTO response di-serialize dengan `plainToInstance()` + `instanceToPlain({ excludeExtraneousValues: true })`, error domain dilempar sebagai `NotFoundException` / `ForbiddenException` dari `@nestjs/common` (ditangkap di controller layer).

---

## Business Rules

**Aturan bisnis yang di-enforce di service layer:**

- `{aturan_1, contoh: role bernama "Admin" tidak boleh diupdate/dihapus -> throw ForbiddenException}`
- `{aturan_2}`

---

## Transactions

**Method yang menggunakan TypeORM transaction (`DataSource.transaction()` / `QueryRunner`):**

| Method | Transaction Scope | Rollback On |
|--------|-----------------|------------|
| `{method}()` | `{seluruh method / partial}` | `{exception type}` |
