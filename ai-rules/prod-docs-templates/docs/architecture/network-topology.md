# Network Topology — {Server Name}

> **IMMUTABLE -- AI TIDAK BOLEH mengubah file ini. Baca sebagai panduan. Untuk output, lihat mapping di ai-rules/README.md.**

> **Server:** {hostname}
> **Terakhir diperbarui:** {YYYY-MM-DD}

---

## Network Overview

{Jelaskan topologi jaringan server secara umum}

Contoh:
Server ini menjalankan seluruh service sebagai **container Docker** via **Docker Compose**. **Traefik** bertindak sebagai satu-satunya entry point publik (port 80/443), melakukan reverse proxy dan **otomatis TLS Let's Encrypt** (HTTP challenge). Container `frontend` dan `backend` terhubung ke Traefik dan satu sama lain melalui **internal Docker network** bernama `ternak-sosmed-network`. Tidak ada service yang bind langsung ke port host selain Traefik — tidak ada PM2, tidak ada Nginx host-level, tidak ada certbot manual.

---

## Network Diagram

```
Internet
    │
    ▼
┌─────────────────────────────────────────┐
│              Traefik                    │
│   {server_ip} (Public) — port 80/443   │
│   Reverse Proxy + Auto TLS (Let's       │
│   Encrypt, HTTP challenge)              │
└─────────────────────────────────────────┘
    │ Docker network: ternak-sosmed-network
    ▼
┌─────────────────────────────────────────┐
│   Docker Network: ternak-sosmed-network │
│                                         │
│  ┌──────────────┐  ┌──────────────┐   │
│  │ Container:   │  │ Container:   │   │
│  │ frontend     │  │ backend      │   │
│  │ (Docker)     │  │ (Docker)     │   │
│  │              │  │              │   │
│  │ Nginx (80)   │  │ NestJS API   │   │
│  │ →React dist/ │  │ (3000)       │   │
│  │ (static only,│  │ dalam        │   │
│  │ bukan proxy) │  │ container    │   │
│  └──────────────┘  └──────────────┘   │
│                                         │
│  ┌──────────────┐  ┌──────────────┐   │
│  │ DB Server    │  │ Redis        │   │
│  │ 10.35.4.61   │  │ (6379)       │   │
│  │ Postgres     │  │              │   │
│  │ (5432)       │  │              │   │
│  └──────────────┘  └──────────────┘   │
└─────────────────────────────────────────┘
```

---

## IP Addressing

| Server/Service | IP Address | Purpose |
|----------------|------------|---------|
| Load Balancer | {public_ip} | Public endpoint, SSL termination |
| App Server | {app_ip} | Application server (this server) |
| Database Server | {db_ip} | Database servers |
| Backup Server | {backup_ip} | Offsite backup storage |
| Monitoring | {monitoring_ip} | Prometheus + Grafana |

---

## Ports & Services

### Inbound (dari Load Balancer)

| Port | Service | Source | Purpose |
|------|---------|--------|---------|
| 80 | Nginx | Load Balancer | HTTP traffic (after SSL termination) |
| 22 | SSH | {admin_ips} | SSH access (restricted IPs only) |

### Internal (antara services)

| Port | Service | Bind Address | Purpose |
|------|---------|--------------|---------|
| 3000 | {backend_app} | Docker internal (`ternak-sosmed-network`) | NestJS API (proses Node.js di dalam container Docker `backend`, port internal expose ke Docker network, TIDAK diexpose langsung ke host — diakses lewat Traefik) |
| 80 | {frontend_app} | Docker internal (`ternak-sosmed-network`) | React static build (`dist/`), di-serve oleh Nginx di dalam container `frontend` (bukan reverse proxy, hanya static file server) |
| 6379 | Redis | Docker internal (`ternak-sosmed-network`) | Cache & session (jika digunakan backend) |

### Outbound (ke external services)

| Destination | Port | Purpose |
|-------------|------|---------|
| {db_ip} | 5432 | PostgreSQL connection (TypeORM, backend NestJS) |
| api.github.com | 443 | Auto-deploy webhook |
| smtp.provider.com | 587 | Email sending |

---

## Firewall Rules

{Jelaskan firewall rules yang diterapkan}

### UFW Status

```bash
sudo ufw status verbose
```

### Active Rules

| Rule | Direction | Port | Source | Action | Purpose |
|------|-----------|------|--------|--------|---------|
| 1 | IN | 22 | {admin_cidr} | ALLOW | SSH access |
| 2 | IN | 80 | {lb_ip} | ALLOW | HTTP from LB |
| 3 | IN | 443 | {lb_ip} | ALLOW | HTTPS from LB |
| 4 | IN | Any | Any | DENY | Default deny |

---

## Docker Networks

> Catatan: jika backend/frontend di-deploy sebagai proses native (bukan container — lihat [deployment.md](../operations/deployment.md)), section ini hanya relevan untuk service pendukung yang memang di-container-kan (mis. Redis).

| Network | Container | Subnet | Purpose |
|---------|-----------|--------|---------|
| {redis_net} | redis | 172.20.0.0/16 | Internal cache/session communication (jika Redis di-container-kan) |

---

## DNS Configuration

### Internal DNS

| Hostname | IP | Purpose |
|----------|-----|---------|
| {hostname} | {ip} | This server |
| db.{domain} | {db_ip} | Database server |
| backup.{domain} | {backup_ip} | Backup server |

### External DNS

```bash
cat /etc/resolv.conf
```

---

## SSL/TLS Configuration

{Jelaskan konfigurasi SSL/TLS}

### Certificate Location

```
/etc/ssl/certs/{domain}.crt
/etc/ssl/private/{domain}.key
```

### SSL Termination

SSL termination dilakukan di **Traefik** (satu-satunya entry point publik di port 80/443), bukan di Nginx. Nginx di dalam container `frontend` hanya serve static file dan tidak pernah menerima traffic eksternal langsung.

Header yang di-forward:
- `X-Forwarded-Proto: https` — Indicate original protocol
- `X-Forwarded-For: {client_ip}` — Original client IP
- `X-Real-IP: {client_ip}` — Real client IP

### Certificate Renewal

{Jelaskan proses renewal certificate}

Contoh:
- Certificate dari Let's Encrypt
- Auto-renewal otomatis oleh Traefik (Let's Encrypt HTTP challenge) — tidak perlu cronjob/certbot manual, sertifikat disimpan di volume `traefik_letsencrypt`
- Renewal 30 hari sebelum expired
- Notification ke DevOps jika renewal gagal

---

## Routing & Load Balancing

### Traefik Routing Configuration

{Jelaskan konfigurasi routing Traefik, biasanya via Docker labels di docker-compose.yml}

Contoh:
- **Entry Point**: `websecure` (443) dengan redirect otomatis dari `web` (80)
- **Health Check**: GET /health setiap 10 detik
- **Session Persistence**: None (stateless)
- **TLS**: Auto Let's Encrypt (HTTP challenge), tidak ada SSL offloading eksternal

### Container Routing (via Traefik labels, internal Docker network `ternak-sosmed-network`)

{Jelaskan routing rules Traefik ke masing-masing container}

| Domain/Path | Target Container | Purpose |
|-------------|-------------------|---------|
| {domain} | container `frontend` (port 80, Nginx serve static `dist/`, bukan proxy) | Frontend (React build) |
| {domain}/api | container `backend` (port 3000, internal Docker network) | Backend NestJS API — diakses lewat Traefik, tidak ada port host binding langsung |

---

## Network Security

### Security Measures

1. **Private Network**: Server tidak bisa diakses langsung dari internet
2. **Firewall**: UFW dengan default deny, whitelist specific IPs
3. **SSH Hardening**: Key-only authentication, no root login, fail2ban
4. **Docker Network Isolation**: Containers di isolated networks
5. **Port Binding**: Services bind ke 127.0.0.1 jika tidak perlu external access
6. **Network Monitoring**: Traffic monitoring, anomaly detection

### SSH Access Control

```bash
# /etc/ssh/sshd_config
PermitRootLogin no
PasswordAuthentication no
PubkeyAuthentication yes
AllowUsers {allowed_users}
MaxAuthTries 3
LoginGraceTime 30
```

### Fail2ban Configuration

```bash
sudo fail2ban-client status sshd
```

---

## Network Troubleshooting

### Common Issues

| Issue | Symptoms | Solution |
|-------|----------|----------|
| Cannot connect to DB | Connection timeout | Check firewall, security group, DB server status |
| Nginx 502 Bad Gateway | Upstream not responding | Check container status, logs, resource usage |
| SSL certificate error | Browser warning | Check certificate validity, renewal status |
| High latency | Slow response time | Check network traffic, DNS resolution, LB health |

### Diagnostic Commands

```bash
# Check connectivity
ping {target_ip}
telnet {target_ip} {port}
curl -v https://{domain}

# Check DNS
nslookup {domain}
dig {domain}

# Check routing
traceroute {target_ip}
ip route show

# Check firewall
sudo ufw status verbose
sudo iptables -L -n

# Check Docker networks
docker network ls
docker network inspect {network_name}
```

---

## Network Monitoring

### Tools

- **iftop**: Real-time bandwidth usage
- **nload**: Network traffic monitoring
- **tcpdump**: Packet capture
- **netstat**: Network connections

### Commands

```bash
# Real-time traffic
sudo iftop -i eth0

# Network statistics
sudo nload eth0

# Capture packets
sudo tcpdump -i eth0 port 80

# Active connections
sudo netstat -tulnp
sudo ss -tulnp
```

---

**Last Updated:** {YYYY-MM-DD}
**Maintained by:** DevOps Team
