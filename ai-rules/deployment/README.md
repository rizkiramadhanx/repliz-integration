# Deployment Guide for AI Agents

> **Status:** GUIDANCE + DATA FILE — AI mengisi data deployment spesifik project, tapi TIDAK mengubah instruksi di bawah "---" divider.
> **Purpose:** Panduan deployment agar AI agent paham environment, build steps, dan prosedur release.
> **Related:**
> - Git remote & repo credentials → [git-remote.md](./git-remote.md) (WAJIB — auto-detection dari local project atau manual input)
> - SSH access rules → [ssh-access.md](./ssh-access.md) (hanya jika project punya server)
> - Production readiness checklist → [production-readiness.md](./production-readiness.md)
> - Maintenance KAK & laporan templates → [maintenance/](./maintenance/) (hanya jika MAINTENANCE_ACTIVE: true)

---

## IMMUTABLE -- AI TIDAK BOLEH MENGUBAH FILE INI. Baca template ini, lalu BUAT file BARU di folder output (dev-docs/, planning/, dll) -- JANGAN ubah template ini.

**What to CREATE in output folder:** Semua informasi tentang bagaimana aplikasi ini di-deploy. AI harus tahu ini sebelum menyarankan atau melakukan deployment.

###  Dual-Repo: Deploy Per Repo

Untuk fullstack, backend dan frontend mungkin deploy terpisah (beda server, beda pipeline). Isi environment matrix dan build steps untuk masing-masing.

**When to update:**
- Saat environment baru ditambahkan
- Saat build/deploy command berubah
- Saat infrastruktur bermigrasi
- Saat CI/CD pipeline berubah

---

## Environment Matrix

| Environment | Backend URL | Frontend URL | Branch | Purpose |
|------------|------------|-------------|--------|---------|
| `{local}` | `{http://localhost:8000}` | `{http://localhost:3000}` | `{dev/feat/*}` | Development |
| `{staging}` | `{https://api-staging.example.com}` | `{https://staging.example.com}` | `{dev}` | Testing |
| `{production}` | `{https://api.example.com}` | `{https://example.com}` | `{main}` | Live |

---

## Infrastructure

| Component | Technology | Notes |
|-----------|-----------|-------|
| Reverse Proxy | `Traefik` | Lihat `traefik-manual/docker-compose.traefik.yml` — routing via Docker labels |
| Container Orchestration | `Docker Compose` | `docker-compose.yml` (production), `docker-compose.dev.yml` + `docker-compose.override.yml` (local dev) |
| Backend Runtime | `Node.js (NestJS)` | `{versi Node, cek .nvmrc / engines}` — jalan di dalam container `backend` |
| Frontend Serving | `nginx (di dalam container frontend)` | Static file hasil `npm run build`, lihat `frontend/Dockerfile` |
| Database | `PostgreSQL` | `{versi + host, lihat TypeORM config}` |
| Cache | `{Redis / tidak ada}` | `{host + port, jika dipakai}` |
| Storage | `{Local volume / S3 / DO Spaces}` | `{catatan}` |
| CDN | `{Cloudflare / lainnya}` | `{catatan}` |
| SSL | `Let's Encrypt (otomatis via Traefik)` | HTTP challenge, lihat `traefik-manual/` |

---

## Build Steps

> **Backend = NestJS (folder `backend/`), Frontend = React + Vite (folder `frontend/`).**

### Local Dev
```bash
# Backend
cd backend
npm install
npm run start:dev
npm run migration:run

# Frontend (fullstack only)
cd frontend
npm install
npm run dev
```

### Production Build
```bash
# Backend
cd backend
npm install
npm run build
npm run migration:run
npm run start:prod

# Frontend (fullstack only)
cd frontend
npm install
npm run build   # Vite build, output ke frontend/dist/
```

---

## CI/CD Pipeline

| Stage | Repo | What Happens |
|-------|------|-------------|
| `lint` | `backend` | `npm run lint` (ESLint) |
| `test` | `backend` | `npm run test` / `npm run test:e2e` (Jest) |
| `lint` | `frontend` | `npm run lint` (ESLint) |
| `build` | `frontend` | `npm run build` (tsc + Vite, output `frontend/dist/`) |

---

## Pre-Deploy Checklist

Sebelum deploy ke production, AI WAJIB verifikasi:
- [ ] All tests pass di branch `dev`
- [ ] Lint pass (backend + frontend)
- [ ] Build sukses (frontend)
- [ ] Tidak ada migration breaking change
- [ ] `.env` production sudah berisi semua key baru (dicek manual oleh human)
- [ ] Rollback plan siap jika deployment gagal

---

## Post-Deploy Verification

Setelah deploy:
```bash
# Backend smoke test
curl https://api.example.com/health
cd backend && npm run test

# Frontend smoke test
curl https://example.com
```

---

## Rollback Procedure

Jika deployment gagal:

```bash
# Backend rollback
cd backend
git checkout main
git revert <MERGE_COMMIT_HASH>
git push
npm run migration:revert   # jika ada migration yang perlu di-rollback

# Frontend rollback
cd frontend
git checkout main
git revert <MERGE_COMMIT_HASH>
git push
```
