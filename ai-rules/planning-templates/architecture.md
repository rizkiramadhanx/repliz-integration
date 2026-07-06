# Architecture Plan — {Nama Produk}

> **IMMUTABLE -- AI TIDAK BOLEH mengubah file ini. Baca sebagai panduan. Untuk output, lihat mapping di ai-rules/README.md.**

> **Status:** PLANNING — Dibuat sebelum development. Jangan diubah tanpa diskusi.
> **Purpose:** Cetak biru teknis: stack, system design, komponen, deployment architecture.

---

##  Project Type Declaration

| Item | Value |
|------|-------|
| Project Type | `{Monolith / Fullstack}` |
| Git Location | `{apps/ — single repo} / {backend/ dan frontend/ — dual repo}` |

---

## 1. Tech Stack

| Layer | Technology | Version | Rationale |
|-------|-----------|---------|----------|
| Backend | NestJS + TypeORM | `{versi}` | `{alasan pemilihan}` |
| Frontend | React + Vite + Mantine + TanStack Query | `{versi}` | `{alasan pemilihan}` |
| Database | `{engine}` | `{versi}` | `{alasan pemilihan}` |
| Cache | `{engine}` | `{versi}` | |
| Queue | `{engine}` | `{versi}` | |
| Search | `{engine}` | `{versi}` | |
| Storage | `{engine}` | — | |
| Web Server | `{engine}` | `{versi}` | |

---

## 2. System Design

### Architecture Pattern

`{Monolith / Modular Monolith / Microservices / Layered Architecture}`

**Alasan:** `{kenapa pola ini dipilih}`

### High-Level Diagram

```text
{deskripsi tekstual alur sistem — bisa diganti diagram nanti}

[Client (React SPA)] → [Nginx] → [Backend NestJS] → [DB]
                           ↓
                      [Cache/Redis]
                           ↓
                      [Queue Worker] → [External API]
```

---

## 3. Component Breakdown

| Komponen | Tipe | Tanggung Jawab | Teknologi |
|----------|------|---------------|----------|
| `{API Server}` | Backend | `{deskripsi}` | `{tek}` |
| `{Admin Panel}` | Frontend | `{deskripsi}` | `{tek}` |
| `{Public Site}` | Frontend | `{deskripsi}` | `{tek}` |
| `{Worker}` | Background | `{deskripsi}` | `{tek}` |

---

## 4. Routing & Middleware Strategy

### Monolith (NestJS serve SPA build)
- Module per domain (`@Module`), route groups via controller prefix
- Guard: `AuthGuard` (JWT), `RolesGuard` (permission)
- Namespace convention: per-module folder (`src/modules/{module}/`)

### Fullstack (NestJS API + React SPA)
- API prefix: `/api/v1`
- Auth: token-based JWT (`@nestjs/jwt`, access token + refresh token)
- CORS policy: whitelist origin frontend (Vite dev server & production domain)

---

## 5. Data Flow

```text
{deskripsi bagaimana data mengalir antar komponen}

[React Form Submit] → [DTO Validation (class-validator)] → [Controller] → [Service] → [TypeORM Repository] → [DB]
                                  ↓
                            [Queue Job] → [Notify]
```

---

## 6. Security Plan

| Area | Strategy |
|------|----------|
| Authentication | JWT via `@nestjs/jwt` (access + refresh token) |
| Authorization | `{RBAC / ABAC / custom}` via NestJS Guards (`RolesGuard`) |
| CSRF | `{protection — biasanya tidak perlu jika auth pakai Bearer token, bukan cookie session}` |
| XSS | React auto-escapes output; sanitize input di DTO/backend |
| SQL Injection | TypeORM query builder / parameterized queries (hindari raw query string) |
| File Upload | `{validation + storage}` — `@nestjs/platform-express` `FileInterceptor` + validasi mimetype/size |

---

## 7. Deployment Architecture

```
{Environment} → {Server} → {CI/CD} → {Monitoring}
```

| Environment | Server | Domain | Branch |
|------------|--------|--------|--------|
| Local | `{localhost}` | — | `dev/feat` |
| Staging | `{server}` | `{staging.example.com}` | `dev` |
| Production | `{server}` | `{example.com}` | `main` |

---

## 8. Key Decisions

| # | Keputusan | Alasan | ADR |
|---|----------|--------|-----|
| 1 | `{keputusan}` | `{alasan}` | `dev-docs/decisions/001-*.md` |
