# Troubleshooting — {Server Name}

> **IMMUTABLE -- AI TIDAK BOLEH mengubah file ini. Baca sebagai panduan. Untuk output, lihat mapping di ai-rules/README.md.**

> **Terakhir diperbarui:** {YYYY-MM-DD}

---

## Overview

{Jelaskan pendekatan troubleshooting di server ini}

Contoh:
File ini berisi **common issues** dan solusinya yang pernah terjadi di server ini. Setiap issue didokumentasikan dengan symptoms, root cause, dan solution untuk mempercepat resolusi masalah di masa depan.

---

## Quick Diagnostics

### System Health Check

```bash
# Run comprehensive health check
/opt/docs/health-check.sh

# Quick system overview
echo "=== Uptime ===" && uptime
echo "=== Memory ===" && free -h
echo "=== Disk ===" && df -h /
echo "=== Docker ===" && docker ps --format "table {{.Names}}\t{{.Status}}"
echo "=== Load ===" && top -bn1 | head -5
```

### Check Service Status

```bash
# Traefik (reverse proxy, otomatis TLS via Let's Encrypt HTTP challenge)
docker compose -f traefik-manual/docker-compose.traefik.yml ps traefik
docker compose -f traefik-manual/docker-compose.traefik.yml logs --tail 50 traefik

# Docker
docker ps
docker stats --no-stream

# Application
curl -f http://127.0.0.1:{port}/health
docker compose -f docker-compose.yml logs --tail 50 {service_name}
```

---

## Common Issues

### Issue: Container Won't Start

**Symptoms:**
- Container exits immediately after start
- `docker ps` doesn't show container
- Error: "Container exited with code 1"

**Diagnosis:**
```bash
# Check container logs
docker logs {container_name}

# Check container exit code
docker inspect {container_name} | grep -i exitcode

# Start in foreground for debugging
docker compose up
```

**Common Causes & Solutions:**

| Cause | Solution |
|-------|----------|
| Port already in use | Check with `ss -tlnp \| grep {port}`, kill process or change port |
| Missing environment variable | Check `.env` file, add missing variable |
| Database connection failed | Verify DB credentials, check DB server status |
| Permission denied | Check volume mount permissions, fix with `chmod/chown` |
| Out of memory | Increase memory limit in docker-compose.yml |

**Solution Example:**
```bash
# Kill process using port
sudo lsof -ti:{port} | xargs kill -9

# Fix volume permissions
sudo chown -R 1000:1000 /opt/{app_name}/storage

# Increase memory limit
nano /opt/{app_name}/docker-compose.yml
# Change: mem_limit: 2g → mem_limit: 4g
docker compose up -d
```

---

### Issue: High CPU Usage

**Symptoms:**
- System slow/unresponsive
- `uptime` shows high load average
- `top` shows high CPU%

**Diagnosis:**
```bash
# Check system CPU
top -bn1 | head -20

# Check Docker container CPU
docker stats --no-stream

# Check specific process
ps aux | grep {process_name}

# Check for runaway processes
ps aux --sort=-%cpu | head -10
```

**Common Causes & Solutions:**

| Cause | Solution |
|-------|----------|
| Runaway process | Kill process: `kill -9 {pid}` |
| Infinite loop in code | Fix code bug, redeploy |
| Too many workers | Reduce worker count in config |
| Malware/cryptominer | Scan with `rkhunter`, `clamav` |
| Insufficient resources | Scale up server or add more instances |

**Solution Example:**
```bash
# Kill runaway process
sudo kill -9 {pid}

# Restart container with lower resource usage
cd /opt/{app_name}
docker compose down
# Edit docker-compose.yml to reduce workers
docker compose up -d

# Monitor after fix
watch -n 1 'docker stats --no-stream'
```

---

### Issue: High Memory Usage

**Symptoms:**
- System slow, swapping
- `free -h` shows low available memory
- OOM killer terminates processes

**Diagnosis:**
```bash
# Check memory usage
free -h

# Check Docker memory
docker stats --no-stream

# Check memory by process
ps aux --sort=-%mem | head -10

# Check for memory leaks
docker exec {container_name} {memory_profiling_command}
```

**Common Causes & Solutions:**

| Cause | Solution |
|-------|----------|
| Memory leak in application | Fix leak, restart container |
| Too many connections | Increase connection pool size or optimize queries |
| Large cache | Reduce cache size or add more memory |
| Insufficient container limit | Increase mem_limit in docker-compose.yml |
| Too many containers | Remove unused containers, consolidate services |

**Solution Example:**
```bash
# Clear system cache
sudo sync; echo 3 | sudo tee /proc/sys/vm/drop_caches

# Restart container to free memory
docker restart {container_name}

# Increase memory limit
nano /opt/{app_name}/docker-compose.yml
# Change: mem_limit: 2g → mem_limit: 4g
docker compose up -d

# Check for memory leaks (Node.js heap snapshot)
docker compose -f docker-compose.yml exec backend node --heapsnapshot-signal=SIGUSR2 dist/main.js
# Atau kirim signal SIGUSR2 langsung ke proses PID 1 di dalam container
docker compose -f docker-compose.yml exec backend kill -USR2 1
```

---

### Issue: Disk Full

**Symptoms:**
- "No space left on device" errors
- Applications crash or fail to write
- `df -h` shows 100% usage

**Diagnosis:**
```bash
# Check disk usage
df -h

# Find large files
du -sh /* | sort -hr | head -20

# Find large directories
du -sh /var/log /opt /tmp | sort -hr

# Find old log files
find /var/log -name "*.gz" -mtime +30

# Check Docker disk usage
docker system df
```

**Common Causes & Solutions:**

| Cause | Solution |
|-------|----------|
| Old log files | Rotate/compress logs, delete old ones |
| Docker images/containers | Run `docker system prune` |
| Backup files | Delete old backups, move to remote storage |
| Temporary files | Clear /tmp, application temp files |
| Database growth | Archive old data, optimize tables |

**Solution Example:**
```bash
# Clean old logs
sudo find /var/log -name "*.gz" -mtime +30 -delete
sudo journalctl --vacuum-time=7d

# Clean Docker
docker system prune -af --volumes

# Clean old backups
find /opt/backups -name "*.tar.gz" -mtime +30 -delete

# Clear temp files
sudo rm -rf /tmp/*
sudo rm -rf /opt/{app_name}/storage/framework/cache/*

# Check disk after cleanup
df -h
```

---

### Issue: Database Connection Failed

**Symptoms:**
- Application error: "Connection refused"
- "Too many connections" error
- Slow database queries

**Diagnosis:**
```bash
# Test database connection (PostgreSQL)
psql -h {db_host} -U {user} -d {database} -c "SELECT 1;"

# Check database status (container, bukan service host-level)
docker compose -f docker-compose.yml ps postgres

# Check active connections
psql -h {db_host} -U {user} -d {database} -c "SELECT count(*) FROM pg_stat_activity;"

# Check for slow/blocking queries
psql -h {db_host} -U {user} -d {database} -c "SELECT pid, state, query, now() - query_start AS duration FROM pg_stat_activity WHERE state != 'idle' ORDER BY duration DESC;"

# Check database logs
docker compose -f docker-compose.yml logs --tail 100 postgres

# Cek koneksi dari sisi backend NestJS (TypeORM connection pool)
docker compose -f docker-compose.yml logs -f backend | grep -i "typeorm\|connect"
```

**Common Causes & Solutions:**

| Cause | Solution |
|-------|----------|
| Database server down | Start/restart database service |
| Wrong credentials | Verify `.env` file backend (`DB_HOST`, `DB_USERNAME`, `DB_PASSWORD`), update credentials |
| Max connections reached | Increase `max_connections` di `postgresql.conf`, atau tuning TypeORM connection pool (`extra.max`) |
| Firewall blocking | Check firewall rules, allow port 5432 |
| Network issue | Ping database server, check routing |

**Solution Example:**
```bash
# Restart database container
docker compose -f docker-compose.yml restart postgres

# Increase max connections (edit env/command postgres di docker-compose.yml,
# atau exec masuk container untuk edit postgresql.conf lalu restart)
docker compose -f docker-compose.yml exec postgres psql -U {user} -d {database} -c "ALTER SYSTEM SET max_connections = 300;"
docker compose -f docker-compose.yml restart postgres

# Kill long-running/blocking query
docker compose -f docker-compose.yml exec postgres psql -U {user} -d {database} -c "SELECT pg_terminate_backend({pid});"

# Check connection from backend process
docker compose -f docker-compose.yml exec backend node -e "require('pg').Client && console.log('pg driver ok')"
```

---

### Issue: Traefik 502/504 Bad Gateway

**Symptoms:**
- Users see "502 Bad Gateway" / "504 Gateway Timeout" error
- Traefik log menunjukkan error konek ke backend container
- Backend application not responding

**Diagnosis:**
```bash
# Check Traefik status & log
docker compose -f traefik-manual/docker-compose.traefik.yml ps traefik
docker compose -f traefik-manual/docker-compose.traefik.yml logs --tail 100 traefik

# Pastikan container backend nyala dan konek ke network yang sama dengan Traefik
docker compose -f docker-compose.yml ps backend
docker network inspect ternak-sosmed-network | grep -A 3 backend

# Check if backend is running & sehat
curl -f http://127.0.0.1:{backend_port}/health

# Check backend logs
docker compose -f docker-compose.yml logs --tail 100 backend
```

**Common Causes & Solutions:**

| Cause | Solution |
|-------|----------|
| Backend container down | Restart container via Docker Compose |
| Backend overloaded | Scale up, add more instances |
| Traefik label salah/hilang di service | Perbaiki label `traefik.*` di docker-compose.yml (rule, entrypoints, loadbalancer port) |
| Container tidak join network Traefik | Pastikan network `ternak-sosmed-network` sama dan `external: true` |
| Backend crashing | Check application logs, fix errors |

**Solution Example:**
```bash
# Restart backend container
docker compose -f docker-compose.yml restart backend

# Check if backend responds
curl -I http://127.0.0.1:{backend_port}

# Traefik akan otomatis mendeteksi ulang container (Docker provider) begitu
# label/port di docker-compose.yml diperbaiki — tidak perlu reload manual,
# cukup apply ulang service-nya:
docker compose -f docker-compose.yml up -d --build backend

# Kalau Traefik sendiri yang bermasalah (jarang), restart Traefik:
docker compose -f traefik-manual/docker-compose.traefik.yml restart traefik

# Scale backend (if using multiple instances)
docker compose -f docker-compose.yml up -d --scale backend=3
```

---

### Issue: SSL Certificate Errors

**Symptoms:**
- Browser shows "Your connection is not private"
- Certificate expired warning
- SSL handshake errors

**Catatan penting:** Sertifikat TLS di project ini di-manage otomatis oleh **Traefik** (Let's Encrypt via HTTP challenge, lihat `traefik-manual/docker-compose.traefik.yml`). Traefik otomatis request & renew certificate menjelang expiry — **bukan** `certbot` manual dan **bukan** file cert di `/etc/nginx` atau `/etc/ssl/certs` host-level.

**Diagnosis:**
```bash
# Cek isi acme.json (state cert Traefik) di dalam volume traefik_letsencrypt
docker compose -f traefik-manual/docker-compose.traefik.yml exec traefik sh -c "cat /letsencrypt/acme.json" | head -50

# Check log Traefik terkait ACME/certresolver
docker compose -f traefik-manual/docker-compose.traefik.yml logs traefik | grep -i "acme\|certificate\|letsencrypt"

# Test SSL connection ke domain
curl -vI https://{domain}
openssl s_client -connect {domain}:443 -showcerts | grep "subject\|issuer\|notAfter"
```

**Common Causes & Solutions:**

| Cause | Solution |
|-------|----------|
| Port 80 tertutup firewall (HTTP challenge gagal) | Buka port 80 & 443, HTTP challenge butuh port 80 accessible dari internet |
| DNS domain belum mengarah ke IP VPS ini | Perbaiki A record domain, tunggu propagasi, lalu restart Traefik |
| `ACME_EMAIL` tidak valid/kosong | Set `ACME_EMAIL` yang valid di env sebelum `docker compose up` |
| Volume `traefik_letsencrypt` hilang/corrupt | Hapus volume, biarkan Traefik request ulang cert dari awal |
| Rate limit Let's Encrypt (terlalu sering request) | Tunggu window rate limit, jangan sering-sering restart volume |

**Solution Example:**
```bash
# Traefik menangani renewal secara otomatis — TIDAK PERLU certbot renew manual.
# Kalau cert dicurigai stuck/corrupt, restart Traefik agar re-check ACME state:
docker compose -f traefik-manual/docker-compose.traefik.yml restart traefik

# Kalau perlu request ulang cert dari nol (misal volume corrupt):
docker compose -f traefik-manual/docker-compose.traefik.yml down
docker volume rm traefik-manual_traefik_letsencrypt
docker compose -f traefik-manual/docker-compose.traefik.yml up -d

# Verify new certificate
curl -I https://{domain} | grep -i ssl
openssl s_client -connect {domain}:443 | grep "subject\|issuer"
```

---

### Issue: Application Errors (5xx)

**Symptoms:**
- Users see 500/502/503/504 errors
- Application logs show errors
- Monitoring alerts for high error rate

**Diagnosis:**
```bash
# Check application logs
docker logs --tail 200 {container_name} | grep -i error

# Check Traefik error log (reverse proxy)
docker compose -f traefik-manual/docker-compose.traefik.yml logs --tail 200 traefik | grep -i error

# Check for specific error patterns
docker logs {container_name} | grep -E "(Fatal|Exception|Error)" | tail -50

# Test application directly
curl -f http://127.0.0.1:{port}/health
```

**Common Causes & Solutions:**

| Cause | Solution |
|-------|----------|
| Application bug | Fix code, redeploy |
| Missing dependency | Install dependency, rebuild image |
| Configuration error | Fix config file, restart |
| Database error | Check DB connection, fix queries |
| Out of resources | Increase memory/CPU limits |

**Solution Example:**
```bash
# Check specific error
docker logs {container_name} | grep -A 5 "Fatal error"

# Restart application
docker restart {container_name}

# Rebuild with fixes
cd /opt/{app_name}
git pull origin main
docker compose build
docker compose up -d

# Monitor after fix
docker logs -f {container_name}
```

---

### Issue: Slow Response Time

**Symptoms:**
- Pages load slowly (> 2 seconds)
- High latency in monitoring
- User complaints about performance

**Diagnosis:**
```bash
# Test response time
curl -w "@curl-format.txt" -o /dev/null -s https://{domain}

# Check system resources
top
docker stats --no-stream

# Check database slow/active queries (PostgreSQL)
psql -U {user} -d {database} -c "SELECT pid, state, query, now() - query_start AS duration FROM pg_stat_activity WHERE state != 'idle' ORDER BY duration DESC;"

# Check application logs for slow operations
docker compose -f docker-compose.yml logs backend | grep -E "(slow|timeout|took [0-9]+ms)"

# Profile application (Node.js clinic / --prof)
docker compose -f docker-compose.yml exec backend node --prof dist/main.js
```

**Common Causes & Solutions:**

| Cause | Solution |
|-------|----------|
| Slow database queries | Add indexes, optimize queries |
| No caching | Enable Redis/Memcached caching |
| Large payloads | Compress responses, paginate results |
| Insufficient resources | Scale up CPU/memory |
| Network latency | Use CDN, optimize assets |

**Solution Example:**
```bash
# Add database index (PostgreSQL, idealnya via TypeORM migration)
docker compose -f docker-compose.yml exec postgres psql -U {user} -d {database} -c "CREATE INDEX idx_user_email ON users(email);"
# Lalu generate migration resmi agar tercatat di source control:
docker compose -f docker-compose.yml exec backend npm run migration:generate -- AddUserEmailIndex

# Enable application caching
# Edit NestJS cache module config (CacheModule/Redis), lalu rebuild & restart container
docker compose -f docker-compose.yml up -d --build backend

# Compress responses
# Aktifkan compression middleware NestJS (mis. package `compression`) di kode backend,
# atau tambahkan middleware compress di Traefik lewat label:
# traefik.http.middlewares.{svc}-compress.compress=true
# traefik.http.routers.{svc}.middlewares={svc}-compress
docker compose -f docker-compose.yml up -d --build backend
```

---

## Emergency Procedures

### Service Down - Quick Recovery

```bash
# 1. Check what's down
docker ps
docker compose -f traefik-manual/docker-compose.traefik.yml ps traefik

# 2. Restart services
docker compose -f traefik-manual/docker-compose.traefik.yml restart traefik
docker compose -f docker-compose.yml restart

# 3. Verify recovery
docker ps
curl -f http://127.0.0.1:{port}/health

# 4. Check logs for root cause
docker compose -f docker-compose.yml logs {service_name} | tail -100
```

### High Load - Emergency Mitigation

```bash
# 1. Identify top processes
top -bn1 | head -20
docker stats --no-stream

# 2. Kill non-critical processes
sudo kill -9 {non_critical_pid}

# 3. Restart heavy containers
docker restart {heavy_container}

# 4. Scale down if needed
docker compose up -d --scale app=1
```

### Security Incident - Isolation

```bash
# 1. Isolate server (EMERGENCY ONLY)
sudo ufw enable
sudo ufw default deny incoming
sudo ufw allow from {admin_ip} to any port 22

# 2. Kill suspicious processes
sudo ps aux | grep suspicious
sudo kill -9 {suspicious_pid}

# 3. Block suspicious IPs
sudo ufw deny from {suspicious_ip}

# 4. Capture forensics
sudo mkdir /tmp/forensics
sudo cp /var/log/* /tmp/forensics/
sudo ps aux > /tmp/forensics/processes.txt
sudo netstat -tulnp > /tmp/forensics/network.txt
```

---

## Diagnostic Tools

### System Tools

```bash
# CPU/Memory/Disk
htop
iotop
iostat -x 1 5
vmstat 1 5

# Network
iftop
nload
ss -tulnp
tcpdump -i eth0

# Processes
ps aux
lsof
strace -p {pid}
```

### Docker Tools

```bash
# Container inspection
docker inspect {container_name}
docker stats
docker top {container_name}

# Logs
docker logs -f {container_name}
docker logs --since 1h {container_name}

# Debugging
docker exec -it {container_name} sh
docker exec {container_name} {debug_command}
```

### Application Tools

```bash
# NestJS (backend)
docker exec {container_name} npm list --depth=0
docker inspect backend                   # Lihat detail proses (uptime, restart count, env)
docker stats backend --no-stream         # Resource usage snapshot
docker compose -f docker-compose.yml logs backend --tail 100  # Log container backend

# Node.js (debugging)
docker exec {container_name} node --inspect dist/main.js

# React/Vite (frontend — static build, di-serve oleh nginx DI DALAM container frontend)
docker exec frontend ls -la /usr/share/nginx/html   # Verifikasi hasil build ter-deploy di dalam container
docker exec frontend nginx -T                       # Cek konfigurasi static serving nginx di dalam container

# Database (PostgreSQL)
docker exec {db_container} psql -U {user} -d {database} -c "SELECT pid, state, query FROM pg_stat_activity;"
docker exec {db_container} psql -U {user} -d {database} -c "SELECT * FROM pg_stat_database WHERE datname = '{database}';"
```

---

## Log Analysis

### Common Log Patterns

```bash
# Find errors (Traefik & container app logs, bukan file log host-level)
docker compose -f traefik-manual/docker-compose.traefik.yml logs traefik | grep -i "error\|exception\|fatal"
docker logs {container_name} | grep -i error

# Find slow requests
docker compose -f docker-compose.yml logs backend | grep -E "took [0-9]{4,}ms"

# Find security issues (akses request via log Traefik, karena Traefik jadi entrypoint HTTP/HTTPS)
docker compose -f traefik-manual/docker-compose.traefik.yml logs traefik | grep -E "(SQL injection|XSS|CSRF)"

# Find 5xx errors
docker compose -f traefik-manual/docker-compose.traefik.yml logs traefik | grep " 5[0-9][0-9] "
```

### Log Rotation Issues

```bash
# Log container di-manage oleh Docker logging driver (default json-file), bukan logrotate host-level.
# Cek ukuran & konfigurasi log driver:
docker inspect --format='{{json .HostConfig.LogConfig}}' {container_name}

# Batasi ukuran log per container via docker-compose.yml (contoh, tambahkan ke service):
#   logging:
#     driver: json-file
#     options:
#       max-size: "10m"
#       max-file: "3"
docker compose -f docker-compose.yml up -d --build {service_name}
```

---

## Performance Tuning

### Quick Wins

```bash
# Clear system cache
sudo sync; echo 3 | sudo tee /proc/sys/vm/drop_caches

# Clear application cache (NestJS Redis cache, jika digunakan)
docker exec {container_name} redis-cli FLUSHDB

# Restart container backend agar config/env baru ter-load
docker compose -f docker-compose.yml up -d --build backend

# Optimize database (PostgreSQL vacuum/analyze)
docker exec {db_container} psql -U {user} -d {database} -c "VACUUM ANALYZE;"

# Restart services (Traefik + semua service app)
docker compose -f traefik-manual/docker-compose.traefik.yml restart traefik
docker compose -f docker-compose.yml restart
```

### Long-term Solutions

- Add more RAM or CPU
- Implement caching (Redis, CDN)
- Optimize database queries
- Use connection pooling
- Implement horizontal scaling
- Upgrade to faster storage (SSD)

---

## When to Escalate

### Escalate to DevOps Lead

- Infrastructure issues (network, storage, compute)
- Security incidents or breaches
- Performance degradation affecting users
- Failed deployments or rollbacks
- Backup/recovery failures

### Escalate to Backend Lead

- Application bugs or crashes
- Database issues or data corruption
- API errors or integration failures
- Performance issues in application code

### Escalate to System Admin

- OS-level issues (kernel, drivers)
- Hardware failures
- Network connectivity issues
- DNS or certificate issues

---

## Prevention

### Regular Maintenance

```bash
# Weekly
- Review logs for errors
- Check disk space and growth
- Test backups
- Update dependencies

# Monthly
- Security audit
- Performance review
- Capacity planning
- Disaster recovery test

# Quarterly
- Penetration testing
- Full system review
- Documentation update
- Training and knowledge sharing
```

### Monitoring Alerts

Set up alerts for:
- High CPU/Memory/Disk usage
- Service downtime
- High error rates
- Slow response times
- Certificate expiry
- Backup failures
- Security incidents

---

## Contributing to This Document

When you resolve a new issue, please add it to this document:

1. **Describe symptoms** clearly
2. **List diagnostic steps** you took
3. **Explain root cause**
4. **Provide solution** with commands
5. **Add prevention tips** if applicable

This helps the team resolve similar issues faster in the future.

---

**Last Updated:** {YYYY-MM-DD}
**Maintained by:** DevOps Team
