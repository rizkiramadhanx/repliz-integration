# {Nama Project} — {Tagline Singkat}

> **IMMUTABLE -- AI TIDAK BOLEH mengubah file ini. Baca sebagai panduan. Untuk output, lihat mapping di ai-rules/README.md.**

> **Auto-generated oleh AI. Diupdate setiap milestone. Lihat `../dev-docs/` untuk dokumentasi development lengkap.**

---

## Apa Ini?

**{1-2 kalimat — apa aplikasi ini, untuk siapa, masalah apa yang diselesaikan}**

---

## Tech Stack

**Backend:**

| Layer | Technology |
|-------|-----------|
| Runtime | Node.js |
| Framework | NestJS |
| ORM | TypeORM |
| Database | PostgreSQL (lihat `backend/src/config/database.config.ts`) |
| Auth | JWT (`@nestjs/jwt`) |

**Frontend:**

| Layer | Technology |
|-------|-----------|
| Build Tool | Vite |
| Framework | React 19 + TypeScript |
| UI Library | Mantine |
| Data Fetching | TanStack Query |
| Routing | react-router |

---

## Quick Start

### Prerequisites

- Node.js `{versi — cek .nvmrc atau package.json engines}`
- PostgreSQL `{versi}`
- npm

### Setup — Backend

```bash
cd backend
npm install

cp .env.example .env
# Edit .env — isi credential database, JWT secret, dll

npm run migration:run
npm run seed          # opsional — seed role/user awal

npm run start:dev
```

### Setup — Frontend

```bash
cd frontend
npm install

cp .env.example .env
# Edit .env — isi VITE_API_URL mengarah ke backend

npm run dev
```

### Access

| Service | URL |
|---------|-----|
| Backend API | `http://localhost:{port dari backend .env}` |
| Frontend | `http://localhost:5173` (default Vite) |

---

## Project Structure

```
backend/src/
├── modules/{feature}/       ← 1 module = 1 domain (controller + service + dto + entities)
├── common/                  ← guards, decorators, interceptors, dto/type bersama
├── config/                  ← konfigurasi database, JWT
├── migration/                ← TypeORM migrations
└── app.module.ts             ← root module

frontend/src/
├── features/{group}/{feature}/   ← page + type + components/ + hooks/ per fitur
├── components/                    ← layout & komponen reusable lintas fitur
├── routes/                        ← route group per domain
└── libs/                          ← axios instance, react-query setup, dayjs
```

---

## Modules

| Module | Deskripsi | Status |
|--------|----------|--------|
| `{nama_modul}` | `{fungsi}` | `{Production / In Progress / Planned}` |

---

## API Documentation

| Method | Endpoint | Auth | Deskripsi |
|--------|----------|------|----------|
| `GET` | `/api/{resource}` | `{permission — mis. role:read}` | `{deskripsi}` |

> Lihat `../planning/api-contract.md` untuk kontrak API lengkap.

---

## Testing

```bash
# Backend
cd backend && npm run test
cd backend && npm run test:cov

# Frontend
cd frontend && npm run lint
```

---

## Deployment

```bash
# Backend
cd backend && npm run build && npm run start:prod

# Frontend
cd frontend && npm run build   # output di frontend/dist/, serve via nginx
```

> Lihat `../dev-docs/deployment/README.md` untuk panduan deployment lengkap.

---

## Contributing

- **Branch:** `dev` untuk development, `main` untuk production
- **Commit:** Format `type: judul` (contoh: `feat: add user authentication`)
- **Review:** Semua perubahan wajib melalui code review dan testing sebelum merge

---

**Last Updated:** {YYYY-MM-DD}
