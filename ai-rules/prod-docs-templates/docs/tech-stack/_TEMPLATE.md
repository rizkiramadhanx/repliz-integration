# {Application Name} — {Technology Stack}

> **IMMUTABLE -- AI TIDAK BOLEH mengubah file ini. Baca sebagai panduan. Untuk output, lihat mapping di ai-rules/README.md.**

> **Terakhir diperbarui:** {YYYY-MM-DD}

---

## Overview

| Item | Value |
|------|-------|
| Application | {app_name} |
| Technology | {tech_stack} |
| Version | {version} |
| Container | {container_name} |
| Port | {port} |
| Compose File | {compose_path} |

{1-2 paragraf yang menjelaskan apa yang dilakukan aplikasi ini, peranannya dalam sistem, dan teknologi yang digunakan}

> **Catatan:** Section "Docker Configuration" + "Process Management (Docker Compose + Traefik)" di bawah adalah **pola REKOMENDASI DEFAULT** untuk stack ini — backend NestJS dan frontend React/Vite SELALU di-deploy sebagai container via Docker Compose, dengan Traefik sebagai reverse proxy (TLS otomatis Let's Encrypt). Section "Process Management (Non-Docker)" dan "Static File Serving (Non-Docker)" di bawahnya HANYA fallback opsional untuk project lain (di luar stack ini) yang tidak memakai Docker — **jangan dipakai jika project sudah pakai Docker Compose**.

---

## Tech Stack Details

### Runtime

| Component | Version | Purpose |
|-----------|---------|---------|
| {runtime} | {version} | {purpose} |
| {framework} | {version} | {purpose} |
| {database_driver} | {version} | {purpose} |

### Dependencies

{List dependencies utama dan versinya}

```
{dependency_1}: {version}
{dependency_2}: {version}
{dependency_3}: {version}
```

---

## Docker Configuration

### Image

```dockerfile
# Base image
FROM {base_image}

# Build commands
{build_commands}

# Runtime
CMD [{cmd}]
```

**Build command:**
```bash
cd /opt/{app_name}
docker build -t {image_name}:{tag} .
```

### Container Settings

```yaml
services:
  {service_name}:
    image: {image_name}:{tag}
    container_name: {container_name}
    restart: unless-stopped
    
    # Resource limits
    deploy:
      resources:
        limits:
          cpus: '{cpu_limit}'
          memory: {memory_limit}
        reservations:
          cpus: '{cpu_reservation}'
          memory: {memory_reservation}
    
    # Security
    cap_drop:
      - ALL
    security_opt:
      - no-new-privileges:true
    
    # Networking
    ports:
      - "{port_mapping}"
    networks:
      - {network_name}
    
    # Volumes
    volumes:
      - {volume_mounts}
    
    # Environment
    env_file:
      - .env
    environment:
      - {env_vars}

    # Reverse proxy & TLS — Traefik auto-detect via Docker provider
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.{service_name}.rule=Host(`{domain}`)"
      - "traefik.http.routers.{service_name}.entrypoints=websecure"
      - "traefik.http.routers.{service_name}.tls.certresolver={certresolver_name}"
      - "traefik.http.services.{service_name}.loadbalancer.server.port={container_port}"
```

---

## Process Management (Docker Compose + Traefik) — REKOMENDASI DEFAULT

**Pola utama untuk stack ini (backend NestJS & frontend React/Vite, keduanya SELALU dijalankan sebagai container).** Tidak ada proses Node.js native di host, tidak ada PM2, tidak ada systemd unit aplikasi, tidak ada certbot manual — Traefik menangani routing + TLS otomatis via Docker labels (lihat contoh `labels:` di section "Docker Configuration" di atas).

### Start / Update (build ulang image)

```bash
cd /opt/{app_name}
docker compose -f docker-compose.yml up -d --build backend
docker compose -f docker-compose.yml up -d --build frontend
```

### Restart tanpa rebuild (mis. setelah ubah env var di `.env` yang dibaca runtime)

```bash
docker compose -f docker-compose.yml restart backend
```

### Stop

```bash
docker compose -f docker-compose.yml stop backend
```

### Status

```bash
docker compose -f docker-compose.yml ps
```

### Logs

```bash
docker compose -f docker-compose.yml logs -f backend --tail 50
```

### Persist setelah reboot server

Tidak perlu langkah tambahan seperti `pm2 save`/`pm2 startup` — `restart: unless-stopped` (atau `always`) pada service di `docker-compose.yml` sudah membuat Docker daemon otomatis start ulang container saat boot, selama Docker daemon sendiri di-enable (`systemctl enable docker`, biasanya sudah default).

---

## Process Management (Non-Docker, FALLBACK) — Backend NestJS via PM2

> **PERINGATAN:** Bagian ini BUKAN pola default untuk stack Docker Compose + Traefik. Hanya gunakan jika project TIDAK di-deploy via Docker (mis. constraint hosting lain di luar stack ini). Untuk stack ini (ternak-sosmed dan sejenisnya), selalu pakai section "Process Management (Docker Compose + Traefik)" di atas.

**Gunakan section ini jika backend di-deploy sebagai proses Node.js native, bukan container.**

### PM2 Ecosystem File

```javascript
// /opt/{app_name}/ecosystem.config.js
module.exports = {
  apps: [{
    name: '{app_name}',
    script: 'dist/main.js',
    cwd: '/opt/{app_name}',
    instances: 1,               // atau 'max' untuk cluster mode
    exec_mode: 'fork',          // atau 'cluster'
    env_file: '.env',
    max_memory_restart: '{memory_limit}',
    restart_delay: 3000,
    autorestart: true,
  }],
};
```

**Start/reload/stop:**
```bash
cd /opt/{app_name}
npm ci --omit=dev
npm run build              # -> dist/main.js

pm2 start ecosystem.config.js
pm2 reload {app_name} --update-env   # zero-downtime reload setelah deploy
pm2 stop {app_name}
pm2 delete {app_name}

# Persist proses agar auto-start setelah reboot server
pm2 save
pm2 startup
```

### Systemd Service (Alternative — tanpa PM2, MASIH FALLBACK non-Docker)

```ini
# /etc/systemd/system/{app_name}.service
[Unit]
Description={app_name} — NestJS backend
After=network.target postgresql.service

[Service]
Type=simple
User=deploy
WorkingDirectory=/opt/{app_name}
EnvironmentFile=/opt/{app_name}/.env
ExecStart=/usr/bin/node dist/main.js
Restart=on-failure
RestartSec=5

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable {app_name}
sudo systemctl restart {app_name}
sudo systemctl status {app_name}
```

---

## Static File Serving (Non-Docker, FALLBACK) — Frontend React + Vite

> **PERINGATAN:** BUKAN pola default. Untuk stack Docker Compose + Traefik, frontend React/Vite di-build lalu di-serve oleh Nginx **di dalam container** (multi-stage Dockerfile: build stage `node:22-alpine`, serve stage `nginx:alpine` men-serve `dist/`) — bukan Nginx host-level manual seperti di bawah ini. Lihat section "Reverse Proxy (Traefik)" untuk pola default.

**Gunakan section ini HANYA jika frontend di-deploy sebagai static build di-serve langsung oleh Nginx host-level (tanpa Docker, tanpa proses Node.js).**

### Build

```bash
cd /opt/{app_name}
npm ci
npm run build          # Output: /opt/{app_name}/dist/
rsync -a --delete dist/ /var/www/{app_name}/dist/
```

### Nginx Static Config

```nginx
# /etc/nginx/sites-available/{app_name}
server {
    listen 80;
    server_name {domain};
    root /var/www/{app_name}/dist;
    index index.html;

    # SPA fallback — semua route non-file diarahkan ke index.html
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Cache asset hasil build Vite (punya content hash di nama file)
    location /assets/ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

```bash
sudo nginx -t
sudo systemctl reload nginx
```

### Environment Variables

> **Untuk frontend React + Vite:** env var (`VITE_*`) dibaca **saat build**, bukan saat runtime — jadi setiap perubahan env memerlukan rebuild + redeploy, bukan sekadar restart proses. Contoh: `VITE_API_BASE_URL=https://{domain}/api`.
>
> **Untuk backend NestJS (pola default, Docker Compose):** env var dibaca saat runtime dari `.env` (via `@nestjs/config`) — cukup restart/rebuild container setelah update: `docker compose -f docker-compose.yml up -d --build backend` (jika image/deps berubah) atau `docker compose -f docker-compose.yml restart backend` (jika hanya `.env` yang berubah dan image tidak berubah).
>
> *Fallback non-Docker (PM2/systemd): cukup restart/reload proses.*

| Variable | Value | Purpose |
|----------|-------|---------|
| {var_1} | {value_1} | {purpose_1} |
| {var_2} | {value_2} | {purpose_2} |

**File location:** `/opt/{app_name}/.env`

---

## Volume Mounts

| Host Path | Container Path | Mode | Purpose |
|-----------|----------------|------|---------|
| {host_path_1} | {container_path_1} | {mode_1} | {purpose_1} |
| {host_path_2} | {container_path_2} | {mode_2} | {purpose_2} |

### Storage Locations

```
/opt/{app_name}/              # Application code
/opt/{app_name}-storage/      # Persistent storage (if separate)
/opt/{app_name}/logs/         # Application logs
/opt/{app_name}/.env          # Environment variables
```

---

## Network Configuration

### Container Network

| Network | Container | IP Range | Purpose |
|---------|-----------|----------|---------|
| {network_name} | {container_name} | {ip_range} | {purpose} |

### Port Mapping

| Host Port | Container Port | Protocol | Bind Address |
|-----------|----------------|----------|--------------|
| {host_port} | {container_port} | {protocol} | {bind_address} |

### Inter-Container Communication

{Jelaskan bagaimana container ini berkomunikasi dengan container lain}

Contoh:
- Communicates with Redis via `{network_name}` network
- Connects to database at `{db_host}:{db_port}`
- Exposes API on port `{port}` for Nginx reverse proxy

---

## Configuration Files

### Main Configuration

```yaml
# /opt/{app_name}/{config_file}
{config_content}
```

### Reverse Proxy (Traefik) — REKOMENDASI DEFAULT

Routing diatur deklaratif via **Traefik labels** langsung di `docker-compose.yml` masing-masing service (backend & frontend) — tidak ada file config Nginx host-level terpisah, tidak ada `nginx -t` / reload manual. Traefik meng-auto-detect container baru lewat Docker provider begitu container start/berubah label.

```yaml
# docker-compose.yml (cuplikan, sudah ada versi lengkap di section "Docker Configuration")
labels:
  - "traefik.enable=true"
  - "traefik.http.routers.{service_name}.rule=Host(`{domain}`)"
  - "traefik.http.routers.{service_name}.entrypoints=websecure"
  - "traefik.http.routers.{service_name}.tls.certresolver={certresolver_name}"
  - "traefik.http.services.{service_name}.loadbalancer.server.port={container_port}"
```

**TLS:** otomatis via Let's Encrypt HTTP challenge yang dikonfigurasi di level Traefik (lihat `traefik-manual/docker-compose.traefik.yml` referensi project) — tidak perlu `certbot` manual atau cron renewal terpisah.

**Apply perubahan label:** cukup `docker compose -f docker-compose.yml up -d` ulang pada service yang labelnya berubah; Traefik pick up otomatis, tidak ada langkah "reload" manual seperti Nginx host-level.

**Nginx di dalam container frontend:** frontend React/Vite tetap memakai `nginx:alpine` sebagai base image serve stage di dalam Dockerfile-nya (multi-stage build) untuk men-serve static `dist/` hasil build — ini bagian arsitektur container yang benar dan tetap dipertahankan, berbeda dari "Nginx host-level manual" yang dimaksud sebagai fallback di bawah.

### Nginx Configuration (Non-Docker, FALLBACK)

> **PERINGATAN:** BUKAN pola default. Hanya relevan jika project tidak memakai Traefik/Docker sama sekali.

**Untuk backend NestJS (reverse proxy ke proses Node.js host-level):**
```nginx
# /etc/nginx/sites-available/{domain}
location /api {
    proxy_pass http://127.0.0.1:{port};
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}
```

**Untuk frontend React (static file, bukan proxy):** lihat section [Static File Serving (Non-Docker, FALLBACK)](#static-file-serving-non-docker-fallback--frontend-react--vite) di atas.

---

## Database Configuration

### Connection Details

| Item | Value |
|------|-------|
| Database Type | {db_type} |
| Host | {db_host} |
| Port | {db_port} |
| Database Name | {db_name} |
| Username | {db_user} |
| Password | {stored_in_env} |

### Connection String

```
postgresql://{db_user}:{db_password}@{db_host}:{db_port}/{db_name}
```

### Migrations (TypeORM — hanya berlaku untuk aplikasi backend NestJS)

```bash
cd /opt/{app_name}

# Run migrations
npm run migration:run

# Rollback (revert migration terakhir)
npm run migration:revert

# Lihat status migration
npm run migration:show
```

---

## Deployment

### Deploy Process

{Jelaskan proses deployment aplikasi ini}

Contoh (Docker Compose + Traefik — REKOMENDASI DEFAULT, backend & frontend):
1. Code di-push ke repository
2. Auto-deploy script / CI pull dari git
3. `docker compose -f docker-compose.yml up -d --build backend` (dan/atau `frontend`) — rebuild image lalu recreate container
4. Traefik auto-detect container baru via Docker provider, tidak ada langkah reverse-proxy manual
5. Health check verification

Contoh (FALLBACK non-Docker, Backend NestJS via PM2):
1. Code di-push ke repository
2. Auto-deploy script pull dari git setiap 1 menit
3. `npm ci --omit=dev && npm run build`
4. `pm2 reload {app_name} --update-env` (zero-downtime reload)
5. Health check verification

Contoh (FALLBACK non-Docker, Frontend React — static build host-level):
1. Code di-push ke repository
2. `npm ci && npm run build` menghasilkan `dist/`
3. Sync `dist/` ke `/var/www/{app_name}/dist/`
4. Tidak ada proses untuk di-restart — Nginx host-level langsung serve file baru

### Manual Deploy

**Backend + Frontend (Docker Compose + Traefik — REKOMENDASI DEFAULT):**
```bash
cd /opt/{app_name}
git pull origin main

# Rebuild & recreate container yang berubah
docker compose -f docker-compose.yml up -d --build backend
docker compose -f docker-compose.yml up -d --build frontend

# Verify
docker compose -f docker-compose.yml ps
docker compose -f docker-compose.yml logs -f backend --tail 50
```

**FALLBACK non-Docker — Backend (NestJS, proses PM2):**
```bash
cd /opt/{app_name}
git pull origin main
npm ci --omit=dev
npm run build

# Zero-downtime reload
pm2 reload {app_name} --update-env

# Verify
pm2 status
pm2 logs {app_name} --lines 50
```

**FALLBACK non-Docker — Frontend (React + Vite, static build host-level):**
```bash
cd /opt/{app_name}
git pull origin main
npm ci
npm run build
rsync -a --delete dist/ /var/www/{app_name}/dist/
sudo systemctl reload nginx
```

### Rollback

**Backend + Frontend (Docker Compose + Traefik — REKOMENDASI DEFAULT):**
```bash
cd /opt/{app_name}
git checkout {previous_commit}
docker compose -f docker-compose.yml up -d --build backend
docker compose -f docker-compose.yml up -d --build frontend
```

**FALLBACK non-Docker — Backend (NestJS via PM2):**
```bash
cd /opt/{app_name}
git checkout {previous_commit}
npm ci --omit=dev
npm run build
pm2 reload {app_name} --update-env
```

**FALLBACK non-Docker — Frontend (React, static build host-level):**
```bash
cd /opt/{app_name}
git checkout {previous_commit}
npm ci
npm run build
rsync -a --delete dist/ /var/www/{app_name}/dist/
```

---

## Monitoring

### Health Check

```bash
# Docker Compose + Traefik — REKOMENDASI DEFAULT (backend & frontend)
docker compose -f docker-compose.yml ps
curl -f https://{domain}/api/health
docker compose -f docker-compose.yml logs -f backend --tail 100

# FALLBACK non-Docker — Backend NestJS (proses PM2)
pm2 status {app_name}
curl -f http://127.0.0.1:{port}/health
pm2 logs {app_name} --lines 100

# FALLBACK non-Docker — Frontend React (static host-level, tidak ada proses — cek Nginx & file)
curl -I https://{domain}
ls -la /var/www/{app_name}/dist
```

### Metrics

{Jelaskan metrics yang dimonitor}

- **CPU Usage**: {threshold}
- **Memory Usage**: {threshold}
- **Response Time**: {threshold}
- **Error Rate**: {threshold}

### Log Locations

```
# Docker Compose + Traefik — REKOMENDASI DEFAULT
docker compose -f docker-compose.yml logs backend    # Application logs (stdout/stderr container)
docker compose -f docker-compose.yml logs traefik     # Reverse proxy / TLS logs (di stack Traefik)

# FALLBACK non-Docker
/opt/{app_name}/logs/{log_file}     # Application logs
/var/log/nginx/{access_log}         # Nginx host-level access logs
/var/log/nginx/{error_log}          # Nginx host-level error logs
```

---

## Backup & Restore

### Backup

```bash
# Backup application code
tar -czf backup-{app_name}-$(date +%Y%m%d).tar.gz /opt/{app_name}

# Backup storage
tar -czf backup-{app_name}-storage-$(date +%Y%m%d).tar.gz /opt/{app_name}-storage

# Backup database (PostgreSQL — hanya perlu dijalankan sekali untuk shared DB, bukan per-app)
pg_dump -h {db_host} -U {db_user} {db_name} > backup-{db_name}-$(date +%Y%m%d).sql
```

### Restore

```bash
# Restore application code
tar -xzf backup-{app_name}-YYYYMMDD.tar.gz -C /

# Restore storage
tar -xzf backup-{app_name}-storage-YYYYMMDD.tar.gz -C /

# Restore database (PostgreSQL)
psql -h {db_host} -U {db_user} {db_name} < backup-{db_name}-YYYYMMDD.sql

# Restart/rebuild container backend (Docker Compose + Traefik — REKOMENDASI DEFAULT) setelah restore code/storage
docker compose -f docker-compose.yml up -d --build backend

# FALLBACK non-Docker: restart proses backend (PM2)
pm2 restart {app_name} --update-env
```

---

## Common Issues & Troubleshooting

### Container Won't Start (Backend NestJS, Docker Compose — REKOMENDASI DEFAULT)

**Symptoms:** Container langsung exit / restart loop setelah `up -d`

**Solutions:**
```bash
# Check logs
docker compose -f docker-compose.yml logs backend --tail 100

# Check container status & exit code
docker compose -f docker-compose.yml ps

# Check resource usage
docker stats {container_name}

# Check disk space (host)
df -h

# Jalankan foreground untuk debug interaktif
docker compose -f docker-compose.yml up backend
```

### High Memory Usage (Docker Compose — REKOMENDASI DEFAULT)

**Symptoms:** Container backend menggunakan memory lebih dari yang diharapkan / mendekati limit

**Solutions:**
```bash
# Check memory usage container
docker stats {container_name}

# Lihat resource limit yang dikonfigurasi (deploy.resources di docker-compose.yml)
docker inspect {container_name} | grep -i memory

# Naikkan limit di docker-compose.yml (deploy.resources.limits.memory), lalu apply:
docker compose -f docker-compose.yml up -d --build backend
```

### FALLBACK non-Docker — Process Won't Start (Backend NestJS via PM2)

> **PERINGATAN:** Hanya relevan jika project TIDAK memakai Docker.

**Symptoms:** Proses PM2 langsung `errored`/exit setelah start

**Solutions:**
```bash
# Check logs
pm2 logs {app_name} --lines 100

# Check resource usage
pm2 monit

# Check disk space
df -h

# Restart dengan verbose output (foreground, untuk debug)
node dist/main.js
```

### FALLBACK non-Docker — High Memory Usage (PM2)

> **PERINGATAN:** Hanya relevan jika project TIDAK memakai Docker.

**Symptoms:** Proses backend menggunakan memory lebih dari yang diharapkan

**Solutions:**
```bash
# Check memory usage
pm2 status {app_name}
pm2 describe {app_name} | grep -i memory

# Check for memory leaks (heap snapshot)
pm2 trigger {app_name} heapdump

# Increase memory restart threshold (edit ecosystem.config.js: max_memory_restart)
# Then:
pm2 reload {app_name} --update-env
```

### Database Connection Failed

**Symptoms:** Backend NestJS tidak bisa connect ke PostgreSQL

**Solutions:**
```bash
# Check database connectivity dari server aplikasi
pg_isready -h {db_host} -p {db_port}

# Check database credentials di .env backend
grep -E "^DB_" /opt/{app_name}/.env

# Check database server status
systemctl status postgresql

# Check firewall rules
sudo ufw status
```

---

## Performance Tuning

### Current Settings

| Setting | Value | Notes |
|---------|-------|-------|
| {setting_1} | {value_1} | {notes_1} |
| {setting_2} | {value_2} | {notes_2} |

### Optimization Recommendations

{List rekomendasi optimasi jika diperlukan}

Contoh:
- Increase worker processes based on CPU cores
- Enable caching for frequently accessed data
- Optimize database queries with proper indexing
- Use CDN for static assets

---

## Security Considerations

### Hardening

{List security measures yang diterapkan}

Contoh:
- Container runs as non-root user
- All capabilities dropped except necessary ones
- Read-only filesystem where possible
- Secrets stored in environment variables, not in code
- Regular security updates via base image updates

### Vulnerability Scanning

```bash
# Scan image for vulnerabilities
docker scout cves {image_name}:{tag}

# Check for outdated packages
docker exec -it {container_name} {package_check_command}
```

---

## Useful Commands

### Container Management — Docker Compose + Traefik (REKOMENDASI DEFAULT)

```bash
# Start/stop/restart/status
docker compose -f docker-compose.yml up -d --build backend   # start atau update (rebuild)
docker compose -f docker-compose.yml restart backend          # restart tanpa rebuild
docker compose -f docker-compose.yml stop backend
docker compose -f docker-compose.yml ps

# View logs
docker compose -f docker-compose.yml logs -f backend --tail 50

# Resource usage & shell akses
docker stats {container_name}
docker exec -it {container_name} sh

# Verify
curl -I https://{domain}
```

### FALLBACK non-Docker — Process Management Backend NestJS (PM2)

> **PERINGATAN:** Hanya relevan jika project TIDAK memakai Docker.

```bash
# Start/stop/restart/reload
pm2 start ecosystem.config.js
pm2 stop {app_name}
pm2 restart {app_name}
pm2 reload {app_name} --update-env   # zero-downtime

# View logs
pm2 logs {app_name} -f
pm2 logs {app_name} --lines 100

# Resource usage
pm2 status
pm2 monit
```

### FALLBACK non-Docker — Static Build Frontend React + Vite

> **PERINGATAN:** Hanya relevan jika project TIDAK memakai Docker (frontend static build di-serve Nginx host-level).

```bash
# Build & deploy
npm run build
rsync -a --delete dist/ /var/www/{app_name}/dist/
sudo systemctl reload nginx

# Verify
curl -I https://{domain}
```

---

## References

- **Documentation:** {doc_url}
- **Repository:** {repo_url}
- **Issues:** {issues_url}

---

**Last Updated:** {YYYY-MM-DD}
**Maintained by:** DevOps Team
