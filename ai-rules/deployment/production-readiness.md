# Production Readiness Guide — {Nama Project}

> **IMMUTABLE -- AI TIDAK BOLEH mengubah file ini. Baca sebagai panduan. Untuk output, lihat mapping di ai-rules/README.md.**

> **Status:** BRIDGE DOCUMENT — Menghubungkan informasi dari `dev-docs/` ke `prod-docs/`
> **Purpose:** Checklist dan requirements lengkap untuk deployment ke production server

---

## Overview

Dokumen ini adalah **jembatan** antara dokumentasi development (`dev-docs/`) dan dokumentasi server production (`prod-docs/`). Gunakan dokumen ini untuk:

1. **AI agent yang sama** yang development dan deploy — sudah punya konteks, tinggal setup server
2. **DevOps/SysAdmin lain** yang deploy — butuh informasi lengkap dari development
3. **Handover** dari development ke operations team

---

## 1. Project Information

**Sumber:** `dev-docs/ai/PROJECT_CONTEXT.md`

| Item | Value |
|------|-------|
| Project Name | {nama_project} |
| Project Type | Fullstack (dual-repo: `backend/` + `frontend/`) |
| Backend Framework | NestJS (Node.js, TypeORM) |
| Frontend Framework | React + Vite |
| Database | PostgreSQL (TypeORM) |
| Cache | {Redis / Memcached / ...} |
| Queue | {Redis Streams / RabbitMQ / ...} |

---

## 2. System Requirements

### 2.1 Server Specifications

**Minimum requirements:**

| Resource | Minimum | Recommended |
|----------|---------|-------------|
| CPU | {2 cores} | {4 cores} |
| RAM | {4 GB} | {8 GB} |
| Disk | {50 GB} | {100 GB} |
| OS | {Ubuntu 22.04 LTS} | {Ubuntu 22.04 LTS} |
| Network | {1 Gbps} | {1 Gbps} |

### 2.2 Software Requirements

**Sumber:** `dev-docs/ai/PROJECT_CONTEXT.md` (Runtime Stack)

| Software | Version | Purpose |
|----------|---------|---------|
| Docker | {24.x} | Container runtime |
| Docker Compose | {2.x} | Orkestrasi container (backend + frontend + postgres) |
| Traefik | {v3.5} | Reverse proxy + otomatis TLS (Let's Encrypt) — lihat `traefik-manual/docker-compose.traefik.yml` |
| Node.js | {20.x/22.x LTS} | Runtime backend (NestJS) & build tool frontend (Vite) — dipakai di dalam image Docker |
| PostgreSQL | {17} | Database (cek TypeORM config di backend) |
| Redis | {7.x} | Cache & queue (jika dipakai) |

### 2.3 Network Requirements

**Sumber:** `dev-docs/architecture/api-flow.md`

| Port | Service | Protocol | Notes |
|------|---------|----------|-------|
| 80 | HTTP | TCP | Redirect to HTTPS |
| 443 | HTTPS | TCP | Main application |
| 22 | SSH | TCP | Server access (restrict IP) |

**Firewall rules:**
- Allow inbound: 80, 443, 22 (restricted IPs only)
- Allow outbound: all (for package updates, external APIs)

---

## 3. Application Architecture

**Sumber:** `dev-docs/architecture/`

### 3.1 Component Overview

```
{Copy diagram dari dev-docs/architecture/api-flow.md}
```

### 3.2 Container Structure

**Sumber:** `dev-docs/architecture/backend-structure.md`, `dev-docs/architecture/frontend-structure.md`

| Container | Image | Port | Network | Volume |
|-----------|-------|------|---------|--------|
| backend | build dari `backend/Dockerfile` (node:22-alpine), jalankan `dist/main.js` | 4000 | `{project}-network` | `app_uploads` |
| frontend | build dari `frontend/Dockerfile` (node:22-alpine build stage → nginx:alpine serve static `dist/`) | 80 | `{project}-network` | — |
| postgres | postgres:17-alpine | 5432 | `{project}-network` | `postgres_data` |
| traefik | traefik:v3.5 (di `traefik-manual/`, terpisah dari compose utama) | 80, 443 | `{project}-network` | `traefik_letsencrypt` |
| redis (opsional) | redis:7-alpine | 6379 | `{project}-network` | `redis_data` |

> Nginx di container **frontend** tetap dipakai (untuk serve static file hasil build React) — bukan reverse proxy host-level. Reverse proxy + TLS ditangani Traefik.

### 3.3 Database Schema

**Sumber:** `dev-docs/architecture/database.md`

| Table | Purpose | Size Estimate |
|-------|---------|---------------|
| {users} | User accounts | {1000 rows} |
| {sessions} | Active sessions | {5000 rows} |
| {logs} | Activity logs | {100K rows/month} |

---

## 4. Environment Variables

**Sumber:** `.env.example` dari repository

### 4.1 Backend Environment

```bash
# Copy dari backend/.env.example (cek variable aktual di backend/src/config)
NODE_ENV=production
PORT={3000}
APP_URL=https://{domain}

DB_HOST={db_host}
DB_PORT=5432
DB_USERNAME={db_user}
DB_PASSWORD={generate_strong_password}
DB_DATABASE={db_name}

JWT_SECRET={generate_strong_secret}

REDIS_HOST={redis_host}
REDIS_PORT=6379
REDIS_PASSWORD={generate_strong_password}

# API Keys / third-party (mis. mailer, Google OAuth — cek backend/src/config)
GOOGLE_CLIENT_ID={get_from_provider}
GOOGLE_CLIENT_SECRET={get_from_provider}
MAIL_HOST={smtp_host}
```

### 4.2 Frontend Environment

```bash
# Copy dari frontend/.env.example — Vite hanya expose variable berprefix VITE_
VITE_API_BASE_URL=https://{domain}/api
VITE_APP_NAME={project_name}
```

### 4.3 Security Notes

**Sumber:** `dev-docs/security/README.md`

- [ ] Semua password di-generate dengan strong password generator (min 32 chars)
- [ ] Tidak ada credential yang di-hardcode di code
- [ ] Semua API keys di-store di environment variables
- [ ] `.env` file di-set permission 600 (read-only owner)

---

## 5. Deployment Process

**Sumber:** `dev-docs/deployment/README.md`

### 5.1 Initial Setup

```bash
# 1. Clone repository
git clone {repo_url} /opt/{project_name}
cd /opt/{project_name}

# 2. Setup environment
cp .env.example .env
nano .env   # Edit BACKEND_DOMAIN, FRONTEND_DOMAIN, DB_*, JWT_*, dll

# 3. Pastikan Traefik jalan (sekali di awal — lihat traefik-manual/)
cd traefik-manual && ACME_EMAIL=you@example.com docker compose -f docker-compose.traefik.yml up -d
cd ..

# 4. Build & start semua service (postgres + backend + frontend) via Docker Compose
./deploy.sh
# Setara dengan: docker compose -f docker-compose.yml up -d --build

# 5. Verify deployment
curl -I https://{FRONTEND_DOMAIN}
curl -I https://{BACKEND_DOMAIN}/health
```

### 5.2 Update Process

```bash
# 1. Pull latest code & rebuild — deploy.sh sudah handle git pull + up -d --build
./deploy.sh

# 2. Migration TypeORM (jika ada migration baru) — dijalankan di dalam container backend
docker compose -f docker-compose.yml exec backend npm run migration:run

# 3. Verify
curl -I https://{FRONTEND_DOMAIN}
curl -I https://{BACKEND_DOMAIN}/health
```

### 5.3 Rollback Process

```bash
# Jika deployment gagal:
# 1. Revert code
git reset --hard HEAD~1

# 2. Rebuild & restart via Docker Compose
docker compose -f docker-compose.yml up -d --build

# 3. Rollback migration (jika perlu)
docker compose -f docker-compose.yml exec backend npm run migration:revert
```

---

## 6. Operations Setup

**Sumber:** `dev-docs/operations/`

### 6.1 Process Manager (Backend NestJS)

**Sumber:** `dev-docs/operations/README.md` (Process Manager section)

Backend NestJS berjalan sebagai container Docker (bukan proses Node.js native/PM2) — process management ditangani oleh Docker Compose lewat restart policy.

**Konfigurasi restart policy (`docker-compose.yml`):**
```yaml
services:
  backend:
    build: ./backend
    restart: unless-stopped   # auto-restart jika container crash atau server reboot
    # ...
```

**Start / rebuild:**
```bash
docker compose -f docker-compose.yml up -d --build backend
```

**Restart (tanpa rebuild, mis. setelah update env):**
```bash
docker compose -f docker-compose.yml restart backend
```

**Status:**
```bash
docker compose -f docker-compose.yml ps backend
```

**Log:**
```bash
docker compose -f docker-compose.yml logs -f backend
```

Auto-start saat server reboot ditangani oleh Docker daemon (`systemctl enable docker`) + restart policy `unless-stopped` di atas — tidak perlu PM2/systemd unit tambahan untuk proses Node.js.

### 6.2 Cronjobs

**Sumber:** `dev-docs/operations/README.md` (Cronjob section)

Scheduled task di dalam aplikasi (cleanup log, weekly report, dll) ditangani `@nestjs/schedule` (`@Cron()`) **di dalam proses backend** — cukup pastikan container backend hidup terus (lihat 6.1), tidak perlu crontab OS terpisah untuk task tersebut.

Crontab OS hanya dipakai untuk task **di luar** proses backend, contoh:

```bash
# Edit crontab (di host, bukan di dalam container)
crontab -e

# Database backup (lihat section backup) — dijalankan lewat docker exec ke container postgres
0 3 * * * /opt/{project_name}/scripts/backup-database.sh
```

### 6.3 Backup Strategy

**Sumber:** `dev-docs/operations/README.md` (Backup section)

**Backup script:**
```bash
#!/bin/bash
# /opt/{project_name}/scripts/backup-database.sh

BACKUP_DIR=/backup/{project_name}
DATE=$(date +%Y%m%d_%H%M%S)
DB_CONTAINER={project_name}-postgres-1

mkdir -p $BACKUP_DIR

# Backup database
docker exec $DB_CONTAINER pg_dump -U {db_user} {db_name} | gzip > $BACKUP_DIR/db_$DATE.sql.gz

# Backup uploads (jika ada — sesuaikan path folder upload aktual di backend, mis. multer destination atau bucket S3)
tar -czf $BACKUP_DIR/uploads_$DATE.tar.gz /opt/{project_name}/backend/{uploads_path}

# Keep only last 30 days
find $BACKUP_DIR -name "*.gz" -type f -mtime +30 -delete

echo "Backup completed: $DATE"
```

**Setup:**
```bash
chmod +x /opt/{project_name}/scripts/backup-database.sh
# Tambahkan ke crontab (lihat section 6.2)
```

### 6.4 SSL Certificate

**Sumber:** `dev-docs/deployment/README.md`

SSL/TLS ditangani otomatis oleh **Traefik** via Let's Encrypt (HTTP challenge) — tidak perlu certbot manual. Konfigurasi ada di `traefik-manual/docker-compose.traefik.yml` (`certificatesresolvers.letsencrypt`).

```bash
# Cek status sertifikat (disimpan di volume traefik_letsencrypt)
docker exec traefik-manual-traefik-1 cat /letsencrypt/acme.json | head -20

# Auto-renewal: sudah otomatis ditangani Traefik, tidak perlu cron/systemd timer tambahan
```

---

## 7. Security Hardening

**Sumber:** `dev-docs/security/README.md`

### 7.1 Server Security

- [ ] Disable root login via SSH
- [ ] Use SSH key authentication only
- [ ] Install fail2ban
- [ ] Configure UFW firewall
- [ ] Enable automatic security updates

### 7.2 Application Security

**Sumber:** `dev-docs/security/README.md` (Part B: HTTP Security Headers)

- [ ] Enable security headers (CSP, HSTS, X-Frame-Options)
- [ ] Configure CORS (jika ada API)
- [ ] Enable rate limiting
- [ ] Setup CSRF protection
- [ ] Enable input validation

### 7.3 Database Security

- [ ] Use strong password (min 32 chars)
- [ ] Restrict database access to application network only
- [ ] Enable SSL connection (jika remote database)
- [ ] Regular backup (daily)
- [ ] Test restore procedure monthly

---

## 8. Monitoring & Alerting

**Sumber:** `dev-docs/operations/README.md` (Monitoring section)

### 8.1 Health Checks

```bash
# Application health (tambahkan endpoint /health di NestJS jika belum ada, mis. via @nestjs/terminus)
curl -f https://{BACKEND_DOMAIN}/health

# Backend container status
docker compose -f docker-compose.yml ps backend

# Database connection
docker compose -f docker-compose.yml exec backend npm run typeorm -- query "SELECT 1" -d src/config/typeorm.config.ts
```

### 8.2 Log Monitoring

```bash
# Application logs
docker compose -f docker-compose.yml logs -f backend
docker compose -f docker-compose.yml logs -f frontend

# Traefik access/routing logs (reverse proxy)
docker logs -f traefik-manual-traefik-1
```

### 8.3 Alerting Setup

**Jika menggunakan external monitoring (UptimeRobot, Datadog, dll):**

- [ ] Setup uptime monitoring (check every 1 minute)
- [ ] Setup SSL certificate expiry alert (30 days before)
- [ ] Setup disk space alert (> 80% usage)
- [ ] Setup error rate alert (> 5% 5xx responses)

---

## 9. Pre-Launch Checklist

### 9.1 Infrastructure

- [ ] Server provisioned dengan specs yang sesuai
- [ ] Domain DNS configured (A record ke server IP)
- [ ] SSL certificate otomatis via Traefik (Let's Encrypt HTTP challenge) — auto-renewal built-in, tidak perlu certbot manual
- [ ] Firewall configured (UFW aktif)
- [ ] SSH hardened (key-only, no root login)
- [ ] Fail2ban installed dan configured

### 9.2 Application

- [ ] Environment variables configured (semua dari `.env.example` backend + frontend)
- [ ] Database migrated (`npm run migration:run` di `backend/`)
- [ ] Upload/storage folder permissions correct (jika ada folder upload lokal)
- [ ] Backend container running & auto-restart (Docker Compose `restart: unless-stopped`)
- [ ] Cronjobs configured dan tested
- [ ] Backup script configured dan tested

### 9.3 Security

- [ ] Security headers enabled
- [ ] CORS configured (jika ada API)
- [ ] Rate limiting enabled
- [ ] Input validation active
- [ ] No debug mode (`APP_DEBUG=false`)
- [ ] No sensitive data in logs

### 9.4 Performance

- [ ] Database indexes created
- [ ] Cache configured (Redis)
- [ ] Static assets optimized (compression, caching)
- [ ] CDN configured (jika perlu)
- [ ] Load testing completed

### 9.5 Monitoring

- [ ] Health check endpoint accessible
- [ ] Log monitoring configured
- [ ] Alerting configured (uptime, SSL, disk, errors)
- [ ] Backup monitoring configured

### 9.6 Documentation

- [ ] `prod-docs/` filled dengan informasi aktual server
- [ ] Deployment process documented dan tested
- [ ] Rollback process documented dan tested
- [ ] Emergency contacts documented
- [ ] Runbook untuk common issues

---

## 10. Handover to Operations

**Jika AI agent yang development berbeda dengan yang maintain server:**

### 10.1 Information to Provide

1. **Repository access:**
   - Git repository URL → lihat [git-remote.md](./git-remote.md) untuk auto-detection dan credential
   - Branch strategy (main = production, dev = staging)
   - Deployment credentials (SSH deploy key atau HTTPS token)
   - **Server git setup:** [prod-docs/docs/operations/repository-access.md](../../prod-docs/docs/operations/repository-access.md)

2. **Server access:**
   - SSH credentials (key-based)
   - Sudo access (jika perlu)
   - Database credentials

3. **Documentation:**
   - `prod-docs/` folder (sudah filled)
   - `dev-docs/` folder (untuk reference)
   - This file (`production-readiness.md`)

4. **Monitoring access:**
   - Uptime monitoring dashboard
   - Log monitoring dashboard
   - Alerting channels (Slack, email, PagerDuty)

### 10.2 Knowledge Transfer

**Topik yang harus di-explain:**

1. **Architecture overview** — bagaimana aplikasi bekerja
2. **Deployment process** — cara deploy update
3. **Rollback process** — cara rollback jika ada issue
4. **Backup & restore** — cara backup dan restore database
5. **Common issues** — masalah yang sering terjadi dan solusinya
6. **Escalation path** — siapa yang dihubungi jika ada issue critical

### 10.3 Emergency Contacts

| Role | Name | Contact | When to Contact |
|------|------|---------|-----------------|
| Developer | {name} | {email/phone} | Application bugs, code issues |
| DevOps | {name} | {email/phone} | Server issues, deployment problems |
| Security | {name} | {email/phone} | Security incidents |
| Management | {name} | {email/phone} | Critical issues, downtime |

---

## 11. Post-Launch Tasks

### 11.1 Day 1

- [ ] Monitor error logs closely
- [ ] Check performance metrics
- [ ] Verify all health checks passing
- [ ] Test user flows manually

### 11.2 Week 1

- [ ] Review logs daily
- [ ] Check backup success daily
- [ ] Monitor resource usage trends
- [ ] Address any user-reported issues

### 11.3 Month 1

- [ ] Review performance metrics
- [ ] Optimize slow queries (jika ada)
- [ ] Review and update documentation
- [ ] Plan for scaling (jika perlu)

---

## References

**Development documentation:**
- `dev-docs/ai/PROJECT_CONTEXT.md` — Project overview dan tech stack
- `dev-docs/architecture/` — Application architecture
- `dev-docs/deployment/` — Deployment process
- `dev-docs/operations/` — Operations setup (process manager, cronjob, backup)
- `dev-docs/security/README.md` — Security requirements

**Production documentation:**
- `prod-docs/AGENTS.md` — AI agent contract untuk server
- `prod-docs/docs/` — Technical documentation server
- `prod-docs/reports-agents/` — Audit log tasks di server

---

**Last Updated:** {YYYY-MM-DD}
**Prepared by:** AI Agent (Development)
**Approved by:** {name}
