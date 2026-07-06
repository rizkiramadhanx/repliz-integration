# Testing Guide for AI Agents

> **Status:** GUIDANCE + DATA FILE — AI mengisi data testing spesifik project, tapi TIDAK mengubah instruksi di bawah "---" divider.
> **Purpose:** Panduan agar AI agent bisa menjalankan, menulis, dan memahami test suite project.

---

## IMMUTABLE -- AI TIDAK BOLEH MENGUBAH FILE INI. Baca template ini, lalu BUAT file BARU di folder output (dev-docs/, planning/, dll) -- JANGAN ubah template ini.

**What to CREATE in output folder:** Semua informasi yang dibutuhkan AI agent untuk menjalankan test dengan benar. Tanpa panduan ini, AI akan skip testing atau gagal setup.

**When to update:**
- Saat test framework berubah
- Saat ada test DB baru atau seed data baru
- Saat ada flaky test yang diketahui
- Saat coverage expectation berubah

---

## Test Stack

Project ini hanya memakai 2 stack: **backend NestJS** (`backend/`) dan **frontend React + Vite** (`frontend/`). Selalu cek script pasti di `backend/package.json` / `frontend/package.json` sebelum menjalankan perintah — daftar di bawah ini adalah acuan, bukan pengganti pengecekan.

| Layer | Framework/Tool | Command |
|-------|---------------|---------|
| Backend Unit/Integration Test | Jest (`@nestjs/testing`) | `cd backend && npm run test` |
| Backend Test Coverage | Jest | `cd backend && npm run test:cov` |
| Backend Test Watch Mode | Jest | `cd backend && npm run test:watch` |
| Backend E2E Test | Jest (`test/jest-e2e.json`) | `cd backend && npm run test:e2e` |
| Backend Lint | ESLint | `cd backend && npm run lint` |
| Frontend Lint | ESLint | `cd frontend && npm run lint` |
| Frontend Type Check | TypeScript | `cd frontend && npx tsc -b --noEmit` |

---

## Test Environment Setup

**Backend (NestJS + Jest):**
- Test unit/service pakai `Test.createTestingModule` dari `@nestjs/testing` dengan provider di-mock manual (lihat contoh di `backend/src/modules/auth/auth.service.spec.ts`) — tidak perlu database sungguhan untuk unit test.
- Untuk E2E test, cek `backend/test/jest-e2e.json` dan file `.env` yang relevan (mis. `.env.test` jika ada) untuk konfigurasi koneksi database/queue.
- Cek apakah ada service dependency (Redis, database Postgres/MySQL, dll) yang perlu jalan lebih dulu — lihat `backend/src/config` atau `docker-compose.yml` jika ada.

**Frontend (React + Vite):**
- Tidak ada unit test runner terpasang saat ini — validasi kualitas kode dilakukan lewat ESLint dan TypeScript compiler.

```bash
# Setup commands
cd backend && npm install
cd frontend && npm install
```

---

## Running Tests

### All tests (backend)
```bash
cd backend && npm run test
```

### Specific test suite / file (backend)
```bash
cd backend && npx jest src/modules/auth/auth.service.spec.ts
```

### Watch mode (backend)
```bash
cd backend && npm run test:watch
```

### With coverage (backend)
```bash
cd backend && npm run test:cov
```

### Lint & type check (frontend)
```bash
cd frontend && npm run lint
cd frontend && npx tsc -b --noEmit
```

---

## Test File Structure

| Path | What's Tested |
|------|--------------|
| `backend/src/modules/**/*.spec.ts` | Unit test per service/controller NestJS (mis. `auth.service.spec.ts`) |
| `backend/test/*.e2e-spec.ts` | Test end-to-end lewat `jest-e2e.json` |
| `frontend/src/**` | Tidak ada unit test — divalidasi via ESLint + `tsc` |

**Naming convention:**
- Backend: file `{namaModul}.service.spec.ts` atau `{namaModul}.controller.spec.ts`, letak bersebelahan dengan source-nya di `src/modules/{modul}/`.
- Method: `describe('NamaService', ...)` + `it('should ...', ...)` (gaya Jest/Jasmine BDD).

---

## Test Patterns (How Tests are Written in This Project)

**Pola testing backend (NestJS + Jest):**
- Pakai `Test.createTestingModule({ providers: [...] }).compile()` untuk membangun DI container test.
- Dependency (repository, JWT service, config, mailer, dll) di-mock manual lewat `{ provide: Token, useValue: mockObj }` — bukan `TestingModule` real database.
- Repository TypeORM di-mock via `getRepositoryToken(EntityClass)`.
- Minimal test yang wajib ada: `it('should be defined', () => { expect(service).toBeDefined(); })`.

**Contoh test pattern nyata (dari `backend/src/modules/auth/auth.service.spec.ts`):**
```ts
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { UserEntity } from '../users/entities/user.entity';
import { RoleEntity } from '../roles/entities/role.entity';
import { MailService } from '../mailer/mailer.service';

const mockJwtService = { sign: jest.fn(), verifyAsync: jest.fn() };

describe('AuthService', () => {
  let service: AuthService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: 'ACCESS_TOKEN_SERVICE', useValue: mockJwtService },
        { provide: 'REFRESH_TOKEN_SERVICE', useValue: mockJwtService },
        { provide: getRepositoryToken(UserEntity), useValue: {} },
        { provide: getRepositoryToken(RoleEntity), useValue: {} },
        { provide: ConfigService, useValue: { get: jest.fn() } },
        { provide: MailService, useValue: {} },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
```

Untuk contoh lain, cek langsung file `*.spec.ts` di `backend/src/modules/**` sebelum menulis test baru — ikuti pola yang sudah ada di modul yang paling mirip.

---

## Known Flaky Tests

| Test | File | Symptom | Workaround |
|------|------|---------|------------|
| `{nama_test}` | `{path}` | `{gejala}` | `{workaround}` |

---

## Coverage Expectations

| Area | Expected Coverage | Current | Notes |
|------|------------------|---------|-------|
| `{modul_kritis}` | `{80%}` | `{current%}` | `{catatan}` |

---

## Pre-Merge Checklist (Testing)

Sebelum merge ke `main`, AI WAJIB memastikan:
- [ ] All tests pass
- [ ] Lint pass
- [ ] Build pass (jika ada)
- [ ] Tidak ada penurunan coverage signifikan
- [ ] Flaky tests tidak muncul (re-run 2x jika perlu)
