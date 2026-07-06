# Security — {Server Name}

> **IMMUTABLE -- AI TIDAK BOLEH mengubah file ini. Baca sebagai panduan. Untuk output, lihat mapping di ai-rules/README.md.**

> **Terakhir diperbarui:** {YYYY-MM-DD}

---

## Overview

{Jelaskan security posture dan hardening yang diterapkan di server ini}

Contoh:
Server ini mengikuti **security best practices** dengan defense-in-depth approach. Hardening dilakukan di semua layer: network, OS, application, dan container. Regular security audits dilakukan setiap {frequency}.

---

## Security Layers

| Layer | Measures |
|-------|----------|
| **Network** | Firewall, private network, VPN, DDoS protection |
| **OS** | Minimal packages, automatic updates, file permissions |
| **SSH** | Key-only auth, no root login, fail2ban |
| **Application** | Input validation, CSRF protection, rate limiting |
| **Container** | Hardened images, resource limits, no root |
| **Data** | Encryption at rest, TLS in transit, backup encryption |
| **Monitoring** | Intrusion detection, log analysis, alerting |

---

## Network Security

### Firewall (UFW)

```bash
# Check status
sudo ufw status verbose

# Active rules
sudo ufw status numbered

# Default policy
sudo ufw default deny incoming
sudo ufw default allow outgoing
```

### Allowed Ports

| Port | Protocol | Source | Purpose |
|------|----------|--------|---------|
| 22 | TCP | {admin_ips} | SSH access |
| 80 | TCP | Load Balancer | HTTP |
| 443 | TCP | Load Balancer | HTTPS |

### Intrusion Prevention (Fail2ban)

```bash
# Check status
sudo fail2ban-client status

# Check SSH jail
sudo fail2ban-client status sshd

# View banned IPs
sudo fail2ban-client get sshd banned

# Unban IP
sudo fail2ban-client set sshd unbanip {ip_address}
```

**Configuration:** `/etc/fail2ban/jail.local`

```ini
[sshd]
enabled = true
port = ssh
filter = sshd
logpath = /var/log/auth.log
maxretry = 3
bantime = 3600
findtime = 600
```

---

## SSH Security

### Configuration

```bash
# /etc/ssh/sshd_config
PermitRootLogin no
PasswordAuthentication no
PubkeyAuthentication yes
MaxAuthTries 3
LoginGraceTime 30
AllowUsers {allowed_users}
AllowTcpForwarding no
X11Forwarding no
```

### SSH Key Management

```bash
# Add new SSH key
echo "{public_key}" >> ~/.ssh/authorized_keys

# List authorized keys
cat ~/.ssh/authorized_keys

# Remove key (edit file)
nano ~/.ssh/authorized_keys

# Key permissions
chmod 700 ~/.ssh
chmod 600 ~/.ssh/authorized_keys
```

### SSH Access Log

```bash
# View SSH login attempts
sudo grep "sshd" /var/log/auth.log

# Failed login attempts
sudo grep "Failed password" /var/log/auth.log

# Successful logins
sudo grep "Accepted" /var/log/auth.log
```

---

## Container Security

### Docker Hardening

```yaml
# docker-compose.yml security settings
services:
  app:
    # Drop all capabilities
    cap_drop:
      - ALL
    
    # Add only necessary capabilities
    cap_add:
      - NET_BIND_SERVICE
    
    # Prevent privilege escalation
    security_opt:
      - no-new-privileges:true
    
    # Read-only filesystem
    read_only: true
    tmpfs:
      - /tmp
      - /var/tmp
    
    # Resource limits
    deploy:
      resources:
        limits:
          cpus: '2.0'
          memory: 2G
          pids: 100
    
    # Run as non-root
    user: "1000:1000"
    
    # Security context
    security_opt:
      - apparmor:docker-default
      - seccomp:default
```

### Container Scanning

```bash
# Scan image for vulnerabilities
docker scout cves {image_name}:{tag}

# Alternative: Trivy
trivy image {image_name}:{tag}

# Check for outdated packages
docker run --rm -v /var/run/docker.sock:/var/run/docker.sock aquasec/trivy image {image_name}:{tag}
```

### Container Isolation

```bash
# List container networks
docker network ls

# Inspect network
docker network inspect {network_name}

# Check container isolation
docker inspect {container_name} | grep -A 10 "NetworkSettings"
```

---

## Application Security

### Web Application Firewall (WAF)

{Jelaskan jika menggunakan WAF}

Contoh:
- **ModSecurity**: Open-source WAF dengan OWASP Core Rule Set
- **Cloudflare WAF**: Cloud-based WAF dengan custom rules
- **AWS WAF**: Managed WAF service

### Security Headers (Traefik Middleware)

Stack ini berjalan sebagai container Docker Compose di belakang Traefik (reverse proxy dengan TLS otomatis Let's Encrypt via HTTP challenge). Security headers **tidak** dipasang lewat `add_header` di nginx host-level — melainkan lewat Traefik middleware yang didefinisikan sebagai label pada service di `docker-compose.yml`:

```yaml
# docker-compose.yml — label pada service yang perlu security headers (mis. backend/frontend)
labels:
  - "traefik.enable=true"
  - "traefik.http.middlewares.security-headers.headers.stsSeconds=31536000"
  - "traefik.http.middlewares.security-headers.headers.stsIncludeSubdomains=true"
  - "traefik.http.middlewares.security-headers.headers.frameDeny=true"
  - "traefik.http.middlewares.security-headers.headers.contentTypeNosniff=true"
  - "traefik.http.middlewares.security-headers.headers.browserXssFilter=true"
  - "traefik.http.middlewares.security-headers.headers.referrerPolicy=strict-origin-when-cross-origin"
  - "traefik.http.middlewares.security-headers.headers.contentSecurityPolicy=default-src 'self'"
  - "traefik.http.middlewares.security-headers.headers.customResponseHeaders.Permissions-Policy=geolocation=(), microphone=(), camera=()"
  - "traefik.http.routers.{service}.middlewares=security-headers"
```

Middleware ini menggantikan pola nginx `add_header` di `/etc/nginx/snippets/security-headers.conf` (host-level) — pola tersebut **tidak lagi dipakai** di stack ini. Jika project menggunakan file provider Traefik (bukan label Docker), definisi setara bisa diletakkan di dynamic config YAML (mis. `traefik/dynamic/security-headers.yml`) dengan struktur `http.middlewares.security-headers.headers.*`.

> Catatan: nginx **tetap ada** di dalam container frontend (`nginx:alpine` pada `frontend/Dockerfile`) untuk serve static build React — itu peran yang berbeda dan tetap dipertahankan. Yang dihilangkan hanya nginx sebagai reverse proxy host-level manual.

### Rate Limiting

Rate limiting dilakukan lewat Traefik middleware `RateLimit`, bukan `limit_req_zone` nginx host-level:

```yaml
# docker-compose.yml — label pada service backend
labels:
  - "traefik.http.middlewares.api-ratelimit.ratelimit.average=10"
  - "traefik.http.middlewares.api-ratelimit.ratelimit.burst=20"
  - "traefik.http.middlewares.login-ratelimit.ratelimit.average=5"
  - "traefik.http.middlewares.login-ratelimit.ratelimit.period=1m"
  - "traefik.http.middlewares.login-ratelimit.ratelimit.burst=3"
  - "traefik.http.routers.ternak-sosmed-backend.middlewares=api-ratelimit"
```

Pola nginx `limit_req_zone` di `/etc/nginx/nginx.conf` (host-level) **tidak dipakai lagi** di stack ini.

### CORS Configuration

CORS untuk backend NestJS diatur di level aplikasi (mis. `app.enableCors({ origin: process.env.FRONT_END_URL })` di NestJS), bukan di config nginx host-level. Traefik juga menyediakan middleware `headers` untuk CORS bila dibutuhkan di layer proxy:

```yaml
# docker-compose.yml — label pada service backend (opsional, jika CORS perlu ditangani di layer proxy)
labels:
  - "traefik.http.middlewares.cors-headers.headers.accessControlAllowOriginList=https://{domain}"
  - "traefik.http.middlewares.cors-headers.headers.accessControlAllowMethods=GET,POST,PUT,DELETE"
  - "traefik.http.middlewares.cors-headers.headers.accessControlAllowHeaders=Authorization,Content-Type"
  - "traefik.http.middlewares.cors-headers.headers.accessControlMaxAge=1728000"
  - "traefik.http.routers.ternak-sosmed-backend.middlewares=cors-headers"
```

Pola nginx `location /api/` dengan `add_header 'Access-Control-Allow-*'` di config host-level **tidak dipakai lagi** di stack ini.

---

## Data Security

### Encryption at Rest

```bash
# Encrypt file
gpg --symmetric --cipher-algo AES256 sensitive-file.txt

# Decrypt file
gpg --decrypt sensitive-file.txt.gpg > sensitive-file.txt

# Encrypt backup
tar -czf - /opt/{app_name} | gpg --symmetric --cipher-algo AES256 > backup.tar.gz.gpg
```

### Encryption in Transit

```bash
# Check SSL/TLS configuration
openssl s_client -connect {domain}:443 -tls1_2
openssl s_client -connect {domain}:443 -tls1_3

# Test SSL configuration
curl -I https://{domain} --tlsv1.2
curl -I https://{domain} --tlsv1.3
```

### Secrets Management

```bash
# Environment file permissions
chmod 600 /opt/{app_name}/.env
chown root:root /opt/{app_name}/.env

# List secrets in environment
grep -E "(PASSWORD|SECRET|KEY|TOKEN)" /opt/{app_name}/.env

# Rotate secrets
nano /opt/{app_name}/.env
# Update value
docker compose -f /opt/{app_name}/docker-compose.yml up -d
```

### Database Security

PostgreSQL berjalan sebagai container (`postgres:17-alpine`) via Docker Compose, bukan instalasi host-level — sehingga tidak ada `pg_hba.conf` di host dan tidak perlu `systemctl reload postgresql`. Koneksi ke Postgres sudah terisolasi lewat Docker network internal (`ternak-sosmed-network`) dan tidak ada port Postgres yang di-publish ke luar, jadi akses hanya bisa dari container lain dalam network yang sama.

```bash
# Check PostgreSQL role privileges (jalankan di dalam container)
docker compose -f docker-compose.yml exec postgres psql -U ${DB_USERNAME:-postgres} -c "\du"

# Pastikan role aplikasi (dipakai TypeORM) tidak superuser
docker compose -f docker-compose.yml exec postgres psql -U ${DB_USERNAME:-postgres} -c "SELECT rolname, rolsuper FROM pg_roles WHERE rolname = '{db_user}';"

# Cek pg_hba.conf bawaan image (opsional, biasanya default image sudah cukup restrictive
# karena akses hanya lewat Docker network, bukan exposed port)
docker compose -f docker-compose.yml exec postgres cat /var/lib/postgresql/data/pg_hba.conf | grep -v "^#"

# Pastikan tidak ada trust/tanpa password auth
docker compose -f docker-compose.yml exec postgres cat /var/lib/postgresql/data/pg_hba.conf | grep -v "^#" | grep -i trust
```

> Catatan: pola lama "edit `/etc/postgresql/{version}/main/pg_hba.conf` di host lalu `systemctl reload postgresql`" **tidak dipakai lagi** di stack ini karena Postgres berjalan sebagai container, bukan service host-level.

---

## Access Control

### User Management

```bash
# List users
cat /etc/passwd | grep -E "/bin/(bash|sh)$"

# List sudo users
cat /etc/group | grep sudo

# Add user
sudo adduser {username}

# Add to sudo group
sudo usermod -aG sudo {username}

# Remove user
sudo deluser {username}
```

### File Permissions

```bash
# Check permissions
ls -la /opt/{app_name}

# Set ownership (jalankan proses Node.js sebagai user dedicated, bukan root)
chown -R deploy:deploy /opt/{backend_app}
chown -R deploy:deploy /opt/{frontend_app}

# Set permissions
chmod -R 755 /opt/{backend_app}
chmod 600 /opt/{backend_app}/.env
chmod 600 /opt/{frontend_app}/.env

# Find world-writable files
find /opt -type f -perm -002

# Find SUID files
find / -perm -4000 -type f
```

### Application Permissions

```bash
# Check user yang menjalankan proses di dalam container backend
docker compose -f docker-compose.yml exec backend whoami
docker compose -f docker-compose.yml exec backend id

# Check user di dalam container frontend
docker compose -f docker-compose.yml exec frontend whoami

# Check file ownership build output di dalam container (opsional, untuk audit)
docker compose -f docker-compose.yml exec backend ls -la /usr/src/app/dist
docker compose -f docker-compose.yml exec frontend ls -la /usr/share/nginx/html
```

**Best practice:** Dockerfile backend (NestJS) sebaiknya menjalankan proses sebagai non-root user, mis. `USER node`, alih-alih membuat dedicated OS user (seperti pola PM2/systemd `deploy` user di server host). Jika `docker compose exec backend whoami` mengembalikan `root`, itu tanda Dockerfile perlu ditambahkan instruksi `USER node` (atau non-root user setara) sebelum `CMD`/`ENTRYPOINT`.

Pola lama `pm2 describe {backend_app} | grep -i "exec user\|uid"` **tidak dipakai lagi** di stack ini karena backend berjalan sebagai container Docker (bukan proses PM2 di host), dan isolasi user dilakukan lewat Docker `USER` directive, bukan dedicated OS user.

---

## Vulnerability Management

### System Updates

```bash
# Check for updates
sudo apt update
apt list --upgradable

# Apply security updates only
sudo apt-get upgrade -s | grep -i security
sudo unattended-upgrade

# Apply all updates
sudo apt upgrade -y

# Reboot if kernel updated
[ -f /var/run/reboot-required ] && sudo reboot
```

### Automatic Updates

```bash
# /etc/apt/apt.conf.d/20auto-upgrades
APT::Periodic::Update-Package-Lists "1";
APT::Periodic::Unattended-Upgrade "1";
APT::Periodic::Download-Upgradeable-Packages "1";
APT::Periodic::AutocleanInterval "7";
```

### Dependency Scanning

```bash
# Backend (NestJS) dependencies
cd /opt/{backend_app}
npm audit

# Frontend (React + Vite) dependencies
cd /opt/{frontend_app}
npm audit
```

---

## Security Auditing

### Security Checklist

- [ ] Firewall configured correctly
- [ ] SSH hardened (key-only, no root)
- [ ] Fail2ban active
- [ ] Automatic updates enabled
- [ ] Containers hardened
- [ ] Secrets encrypted and rotated
- [ ] SSL/TLS properly configured
- [ ] Security headers enabled
- [ ] Rate limiting configured
- [ ] Backups encrypted
- [ ] Logs monitored
- [ ] Intrusion detection active

### Security Scanning Tools

```bash
# Lynis - System audit
sudo lynis audit system

# OpenSCAP - Compliance check
oscap xccdf eval --profile xccdf_org.ssgproject.content_profile_standard /usr/share/xml/scap/ssg/content/ssg-ubuntu2204-ds.xml

# CIS Benchmark
# Download from: https://www.cisecurity.org/cis-benchmarks
```

### Penetration Testing

{Jelaskan penetration testing yang dilakukan}

Contoh:
- **Internal**: Quarterly security review by DevOps team
- **External**: Annual penetration test by third-party security firm
- **Continuous**: Automated security scanning in CI/CD pipeline

---

## Incident Response

### Security Incident Checklist

1. **Detect**: Identify the incident from logs/alerts
2. **Contain**: Isolate affected systems
3. **Eradicate**: Remove threat and patch vulnerability
4. **Recover**: Restore from clean backup
5. **Learn**: Document incident and improve defenses

### Emergency Contacts

| Role | Contact | When to Call |
|------|---------|--------------|
| Security Lead | {contact} | Security incidents, breaches |
| DevOps Lead | {contact} | Infrastructure compromise |
| Legal | {contact} | Data breach, compliance issues |
| PR | {contact} | Public disclosure needed |

### Incident Response Commands

```bash
# Isolate server (emergency only)
sudo ufw enable
sudo ufw default deny incoming
sudo ufw allow from {admin_ip} to any port 22

# Kill suspicious process
sudo kill -9 {pid}

# Block IP
sudo ufw deny from {suspicious_ip}

# Capture forensic data
sudo mkdir /tmp/forensics
sudo cp /var/log/* /tmp/forensics/
sudo ps aux > /tmp/forensics/processes.txt
sudo netstat -tulnp > /tmp/forensics/network.txt
```

---

## Compliance

### Data Protection (GDPR)

{Jelaskan GDPR compliance measures}

- Data encrypted at rest and in transit
- Right to erasure implemented
- Data breach notification procedure (< 72 hours)
- Data processing agreements with vendors
- Privacy policy and cookie notice

### PCI DSS (if handling payments)

{Jelaskan PCI DSS compliance jika applicable}

- Cardholder data encrypted
- Network segmentation
- Regular security testing
- Access control and monitoring
- Vulnerability management program

---

## Security Monitoring

### Log Analysis

```bash
# Failed login attempts
sudo grep "Failed password" /var/log/auth.log | tail -20

# Suspicious activity
sudo grep "sudo:" /var/log/auth.log | grep -v "{admin_user}"

# Web application attacks
grep -E "(SELECT|UNION|DROP|INSERT|UPDATE|DELETE)" /var/log/nginx/access.log

# Port scanning
sudo grep "refused connect" /var/log/syslog
```

### Intrusion Detection

```bash
# Check for rootkits
sudo rkhunter --check

# Check for malware
sudo clamscan -r /opt

# Check for unauthorized changes
sudo aide --check

# Monitor file integrity
sudo auditctl -w /etc/passwd -p wa -k passwd_changes
```

---

## Security Best Practices

### DO

- ✅ Use strong, unique passwords
- ✅ Enable 2FA for all accounts
- ✅ Keep all software updated
- ✅ Encrypt sensitive data
- ✅ Monitor logs regularly
- ✅ Backup data regularly
- ✅ Test backups regularly
- ✅ Use principle of least privilege
- ✅ Segment networks
- ✅ Audit access regularly

### DON'T

- ❌ Use default passwords
- ❌ Share credentials
- ❌ Disable security features
- ❌ Run as root unnecessarily
- ❌ Expose unnecessary ports
- ❌ Store secrets in code
- ❌ Ignore security alerts
- ❌ Skip security updates
- ❌ Use outdated software
- ❌ Grant excessive permissions

---

**Last Updated:** {YYYY-MM-DD}
**Maintained by:** DevOps + Security Team
