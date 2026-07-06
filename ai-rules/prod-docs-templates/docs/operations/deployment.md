# Deployment — {Server Name}

> **IMMUTABLE -- AI TIDAK BOLEH mengubah file ini. Baca sebagai panduan. Untuk output, lihat mapping di ai-rules/README.md.**

> **Terakhir diperbarui:** {YYYY-MM-DD}

---

## Overview

{Jelaskan strategi deployment yang digunakan di server ini}

Contoh:
Server ini menggunakan **pull-based deployment** dengan auto-deploy script yang berjalan setiap 1 menit via systemd timer. Script akan pull code terbaru dari repository, build Docker image, dan restart container jika ada perubahan.

---

## Deployment Strategy

| Item | Value |
|------|-------|
| Strategy | {pull-based / push-based / manual} |
| Automation | {systemd timer / cron / GitHub Actions} |
| Frequency | {every 1 minute / on-demand / manual} |
| Rollback | {git checkout / docker tag / manual} |
| Downtime | {zero-downtime / brief downtime} |

---

## Auto-Deploy Configuration

### Systemd Timer

```ini
# /etc/systemd/system/auto-deploy.timer
[Unit]
Description=Auto Deploy Timer

[Timer]
OnBootSec=1min
OnUnitActiveSec=1min
Unit=auto-deploy.service

[Install]
WantedBy=timers.target
```

### Deploy Script

```bash
# /opt/auto-deploy/auto-deploy.sh
#!/bin/bash
{script_content}
```

### Enable/Disable Auto-Deploy

```bash
# Check status
systemctl status auto-deploy.timer

# Enable
sudo systemctl enable auto-deploy.timer
sudo systemctl start auto-deploy.timer

# Disable (maintenance mode)
sudo systemctl stop auto-deploy.timer
sudo systemctl disable auto-deploy.timer

# Manual trigger
sudo systemctl start auto-deploy.service
```

---

## Initial Server Setup (Pertama Kali — Gantikan SFTP/Drag-Drop)

> **Jika sebelumnya deploy via SFTP/FileZilla drag-drop, ikuti prosedur ini untuk migrasi ke git-based deploy.**

### Step 1: Clone Repository ke Server

> **Catatan arsitektur:** Backend dan frontend berjalan sebagai container Docker (image dibuild dari `backend/Dockerfile` dan `frontend/Dockerfile`), diorkestrasi via Docker Compose, dan diekspos ke internet lewat **Traefik** sebagai reverse proxy dengan TLS otomatis (Let's Encrypt, HTTP challenge). Isolasi proses ditangani oleh container itu sendiri — **bukan** oleh user OS dedicated (tidak ada PM2/systemd yang menjalankan proses Node sebagai user tertentu di host). Tidak perlu `chown` ke user `deploy`/`www-data`; ownership file di host hanya relevan untuk source code sebelum di-build ke image.

**Clone repository (satu repo untuk backend + frontend, atau sesuaikan jika terpisah):**
```bash
# 1. SSH to server
ssh {user}@{server}

# 2. Backup existing code (SAFETY FIRST!)
sudo cp -r /opt/{app_name} /opt/{app_name}.backup.$(date +%Y%m%d)

# 3. Clone dari repository
cd /opt
sudo git clone {CLONE_URL} {app_name}

# 4. Restore .env dari backup
sudo cp /opt/{app_name}.backup.*/.env /opt/{app_name}/.env

# 5. Pastikan network eksternal untuk Traefik sudah ada (sekali saja, lihat traefik-manual/)
docker network inspect {network_name} >/dev/null 2>&1 || docker network create {network_name}

# 6. Build & jalankan semua service via Docker Compose
cd /opt/{app_name}
docker compose -f docker-compose.yml up -d --build
```

Backend dan frontend dibuild dan dijalankan sebagai container oleh perintah yang sama di atas — tidak ada langkah `npm ci` / `npm run build` manual di host maupun start proses via PM2, karena semuanya terjadi di dalam image Docker saat `--build`.

### Step 2: Setup Git Authentication di Server

> **Pilih salah satu. Lihat [repository-access.md](./repository-access.md) untuk detail.**

**Opsi A: Deploy Key (SSH — Recommended)**

```bash
ssh-keygen -t ed25519 -C "deploy@{server_name}" -f ~/.ssh/id_ed25519_deploy -N ""
cat ~/.ssh/id_ed25519_deploy.pub
# Tambahkan public key ke GitHub/GitLab sebagai Deploy Key
ssh -T git@github.com  # Test koneksi
```

**Opsi B: Token HTTPS (Jika SSH diblokir)**

```bash
git config --global credential.helper store
git clone https://{username}:{token}@github.com/{owner}/{repo}.git /var/www/{app_name}
```

### Step 3: Verifikasi Setup

```bash
cd /var/www/{app_name}
git fetch origin
git log --oneline -5
echo "SUCCESS: Git-based deploy ready"
```

---

## Manual Deployment

### Application Deploy Steps — Backend (NestJS, container)

```bash
# 1. SSH to server
ssh {user}@{server}

# 2. Navigate to application
cd /opt/{app_name}

# 3. Pull latest code
git pull origin main

# 4. Rebuild & recreate container backend (ambil env baru dari .env otomatis)
docker compose -f docker-compose.yml up -d --build backend

# 5. Jika hanya perlu restart proses tanpa rebuild image (tidak ada perubahan kode/env):
docker compose -f docker-compose.yml restart backend

# 6. Verify
docker compose -f docker-compose.yml ps
curl -f https://{BACKEND_DOMAIN}/health
```

### Application Deploy Steps — Frontend (React + Vite, container)

Frontend di-build sebagai static asset (`npm run build` → `dist/`) di dalam image, lalu diserve oleh **Nginx yang berjalan di dalam container** (base image `nginx:alpine` pada `frontend/Dockerfile`) — bukan Nginx host-level. Tidak ada `rsync` manual ke document root host.

```bash
# 1. SSH to server
ssh {user}@{server}

# 2. Navigate to application
cd /opt/{app_name}

# 3. Pull latest code
git pull origin main

# 4. Rebuild & recreate container frontend
docker compose -f docker-compose.yml up -d --build frontend

# 5. Verify
docker compose -f docker-compose.yml ps
curl -I https://{FRONTEND_DOMAIN}
```

### Database Migration (TypeORM)

Migration dijalankan di dalam container backend yang sudah jalan (`docker compose exec`), bukan `npm run` langsung di host.

```bash
cd /opt/{app_name}

# Run migrations
docker compose -f docker-compose.yml exec backend npm run migration:run

# Verify migration status
docker compose -f docker-compose.yml exec backend npm run migration:show

# Rollback if needed (revert migration terakhir)
docker compose -f docker-compose.yml exec backend npm run migration:revert
```

### Routing Configuration Update (Traefik Labels)

> Tidak ada file konfigurasi Nginx host-level (`/etc/nginx/sites-available/...`) untuk di-edit, dan tidak ada `systemctl reload nginx` yang perlu dijalankan. Routing/TLS diatur lewat **Traefik labels** pada masing-masing service di `docker-compose.yml`, misalnya:
>
> ```yaml
> labels:
>   - traefik.enable=true
>   - traefik.http.routers.{app_name}-backend.rule=Host(`${BACKEND_DOMAIN}`)
>   - traefik.http.routers.{app_name}-backend.entrypoints=websecure
>   - traefik.http.routers.{app_name}-backend.tls.certResolver=letsencrypt
>   - traefik.http.services.{app_name}-backend.loadbalancer.server.port={port}
> ```
>
> Traefik menggunakan Docker provider dan **auto-detect** perubahan container (start/stop/label baru) tanpa reload manual.

```bash
# Jika perlu ubah domain/host rule atau port:
# 1. Edit label di docker-compose.yml
nano docker-compose.yml

# 2. Apply perubahan (recreate container dengan label baru)
docker compose -f docker-compose.yml up -d

# 3. Verify — Traefik akan otomatis re-route begitu container baru terdeteksi
curl -I https://{domain}
```

---

## Deployment Checklist

### Pre-Deployment

- [ ] Code tested in staging environment
- [ ] Database migrations reviewed and tested
- [ ] Backup database before deployment
- [ ] Notify team about deployment window
- [ ] Check disk space and resources

### During Deployment

- [ ] Pull latest code from repository
- [ ] Build Docker image successfully
- [ ] Run database migrations
- [ ] Restart container
- [ ] Verify application health

### Post-Deployment

- [ ] Test critical user flows
- [ ] Monitor logs for errors
- [ ] Check resource usage (CPU, memory, disk)
- [ ] Verify monitoring alerts are working
- [ ] Update documentation if needed
- [ ] Write deployment report

---

## Rollback Procedures

### Application Rollback

```bash
# 1. Stop current container
cd /opt/{app_name}
docker compose down

# 2. Checkout previous version
git checkout {previous_commit}

# 3. Rebuild image
docker compose build

# 4. Start container
docker compose up -d

# 5. Verify
docker ps
docker logs {container_name}
```

### Database Rollback

```bash
# Option 1: Run rollback migration (TypeORM) di dalam container backend
cd /opt/{app_name} && docker compose -f docker-compose.yml exec backend npm run migration:revert

# Option 2: Restore from backup (PostgreSQL, container postgres)
docker compose -f docker-compose.yml exec -T postgres psql -U {user} -d {database} < backup-{date}.sql
```

### Emergency Rollback

{Jelaskan prosedur rollback darurat jika deploy gagal total}

```bash
# Stop all services (termasuk Traefik jika perlu total shutdown)
docker compose -f docker-compose.yml down

# Restore from backup
/opt/docs/backup-apps.sh restore {backup_date}

# Start services kembali (Traefik akan otomatis re-attach routing)
docker compose -f docker-compose.yml up -d
```

---

## Blue-Green Deployment (if applicable)

{Jelaskan jika menggunakan blue-green deployment}

> Dengan Docker Compose + Traefik, pola standar (bukan true zero-downtime) adalah: build image baru, lalu `docker compose up -d --build {service}` — Compose akan recreate container dengan image baru, dan Traefik otomatis mengarahkan traffic ke container baru begitu health check-nya lolos (tidak ada swap file Nginx/sed manual).

### Deploy Standar (Recreate)

```bash
# 1. Build image baru & recreate container backend
cd /opt/{app_name}
git pull origin main
docker compose -f docker-compose.yml up -d --build backend

# 2. Verify
docker compose -f docker-compose.yml ps
curl -f https://{BACKEND_DOMAIN}/health
```

### True Zero-Downtime (opsional, jika dibutuhkan presisi lebih)

Jika downtime singkat saat recreate tidak bisa diterima, jalankan dua service sementara (mis. `backend-blue` dan `backend-green`) di `docker-compose.yml` dengan image berbeda, deploy ke service yang idle, test langsung ke container-nya, lalu pindahkan label `traefik.http.routers.{app_name}-backend.rule` (atau service reference) ke service yang baru sudah siap. Setelah traffic pindah, matikan service lama. Jangan over-engineer pola ini kecuali benar-benar diperlukan — untuk kebanyakan deploy, recreate biasa di atas sudah cukup.

---

## Canary Deployment (if applicable)

{Jelaskan jika menggunakan canary deployment}

> Tidak menggunakan Nginx upstream host-level. Dengan Traefik, traffic split diatur lewat **weighted round robin** pada level service (Docker provider), dengan menjalankan dua service Compose (stable & canary) yang berbagi router yang sama.

### Traffic Split (Traefik weighted service)

```yaml
# docker-compose.yml (potongan)
services:
  backend-stable:
    build: ./backend
    labels:
      - traefik.enable=true
      - traefik.http.services.backend-stable.loadbalancer.server.port=4000

  backend-canary:
    build: ./backend
    labels:
      - traefik.enable=true
      - traefik.http.services.backend-canary.loadbalancer.server.port=4000

  # Router + weighted service gabungan (90% stable, 10% canary)
  # didefinisikan lewat dynamic config Traefik (file provider) atau label
  # traefik.http.services.backend-weighted.loadbalancer.* dengan sub-service weights
```

---

## Environment Management

### Environment Variables

```bash
# Location
/opt/{app_name}/.env

# Update variables
nano /opt/{app_name}/.env

# Restart container to apply
cd /opt/{app_name}
docker compose up -d
```

### Secrets Management

{Jelaskan bagaimana secrets dikelola}

Contoh:
- Secrets disimpan di `.env` file dengan permission 600
- Tidak di-commit ke git
- Backup encrypted di secure location
- Rotated setiap 90 hari

---

## Deployment Windows

| Window | Time | Purpose |
|--------|------|---------|
| Regular Deploy | {time} | Normal deployments |
| Maintenance Window | {time} | Major updates, migrations |
| Emergency Deploy | Anytime | Critical bug fixes, security patches |

---

## Monitoring During Deployment

### What to Monitor

- **Application Logs**: `docker logs -f {container_name}`
- **Traefik Logs** (reverse proxy, akses & error routing): `docker logs -f traefik` (atau `docker compose -f traefik-manual/docker-compose.traefik.yml logs -f traefik`)
- **Frontend Nginx Logs** (Nginx di dalam container frontend, static file server): `docker logs -f {frontend_container_name}`
- **Resource Usage**: `docker stats`, `htop`
- **Response Time**: `curl -w "@curl-format.txt" -o /dev/null -s https://{domain}`
- **Error Rate**: Check logs for 5xx errors

### Alerting

{Jelaskan alerting yang aktif selama deployment}

Contoh:
- Slack notification on deployment start
- Email alert if error rate > 5%
- PagerDuty if service down > 5 minutes

---

## Common Deployment Issues

### Build Failed

**Symptoms:** Docker build fails

**Solutions:**
```bash
# Check build logs
docker compose build --no-cache

# Check disk space
df -h

# Check Docker daemon
systemctl status docker

# Clean Docker cache
docker system prune -a
```

### Container Won't Start

**Symptoms:** Container exits immediately

**Solutions:**
```bash
# Check logs
docker logs {container_name}

# Check environment variables
docker exec -it {container_name} env

# Check volume mounts
docker inspect {container_name} | grep -A 10 Mounts

# Start in foreground for debugging
docker compose up
```

### Database Migration Failed

**Symptoms:** Application error after migration

**Solutions:**
```bash
cd /opt/{app_name}

# Check migration status (di dalam container backend)
docker compose -f docker-compose.yml exec backend npm run migration:show

# Rollback migration
docker compose -f docker-compose.yml exec backend npm run migration:revert

# Restore from backup if needed (PostgreSQL, container postgres)
docker compose -f docker-compose.yml exec -T postgres psql -U {user} -d {database} < backup.sql
```

---

## Deployment Scripts

### Quick Deploy — Backend (NestJS)

```bash
#!/bin/bash
# /opt/docs/deploy-backend-quick.sh

APP_NAME={backend_app}
BRANCH=${1:-main}

cd /opt/$APP_NAME
git pull origin $BRANCH
docker compose -f docker-compose.yml up -d --build backend
docker compose -f docker-compose.yml ps backend
```

### Quick Deploy — Frontend (React + Vite, container)

```bash
#!/bin/bash
# /opt/docs/deploy-frontend-quick.sh

APP_NAME={app_name}
BRANCH=${1:-main}

cd /opt/$APP_NAME
git pull origin $BRANCH
# Build & recreate container frontend — build (npm run build -> dist/) terjadi
# di dalam image, lalu diserve oleh Nginx di dalam container (nginx:alpine).
# Tidak ada rsync ke host maupun reload Nginx host-level.
docker compose -f docker-compose.yml up -d --build frontend
```

### Full Deploy with Migration (Backend)

```bash
#!/bin/bash
# /opt/docs/deploy-backend-full.sh

APP_NAME={app_name}
BRANCH=${1:-main}

# Backup database
/opt/docs/backup-database.sh

# Deploy
cd /opt/$APP_NAME
git pull origin $BRANCH
docker compose -f docker-compose.yml up -d --build backend

# Run migrations (TypeORM) di dalam container backend
docker compose -f docker-compose.yml exec backend npm run migration:run

# Verify
curl -f https://{BACKEND_DOMAIN}/health
```

---

**Last Updated:** {YYYY-MM-DD}
**Maintained by:** DevOps Team
