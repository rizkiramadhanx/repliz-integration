# Scheduler Setup — NestJS (@nestjs/schedule)

> **IMMUTABLE -- AI TIDAK BOLEH mengubah file ini. Baca sebagai panduan. Untuk output, lihat mapping di ai-rules/README.md.**

> **Status:** WAJIB jika backend menggunakan `@nestjs/schedule` untuk scheduled task
> **Purpose:** Dokumentasi setup application-level scheduler untuk backend NestJS
> **Output Location:** `backend/docs/operations/cronjobs/` — **INSIDE git repo. DILARANG menulis credential aktual. Gunakan referensi .env atau prod-docs/.**

---

## Overview

**Framework:** NestJS (backend)  
**Scheduler Package:** `@nestjs/schedule` (`@Cron()` / `@Interval()` / `@Timeout()` decorator)  
**Tasks:** {List scheduled tasks, contoh: hapus log lama tiap hari jam 00:00}

---

## NestJS Scheduler (@nestjs/schedule)

### Overview

`@nestjs/schedule` menjalankan task terjadwal **di dalam proses aplikasi NestJS** — tidak perlu cronjob OS terpisah untuk tiap task. Cukup pastikan container backend selalu hidup (Docker Compose `restart: unless-stopped` di `docker-compose.yml`, lihat juga `supervisor.md` jika project memakai supervisor di dalam container), scheduler otomatis berjalan mengikuti decorator `@Cron()` yang didefinisikan di provider (`@Injectable()` class).

### Prerequisites

- Package `@nestjs/schedule` sudah terpasang (`npm install @nestjs/schedule`)
- `ScheduleModule.forRoot()` sudah di-import di `app.module.ts`
- Provider yang berisi `@Cron()` sudah didaftarkan di module terkait (`providers: [...]`)

**Check package terpasang:**
```bash
cd backend
npm ls @nestjs/schedule
```

### Setup

**1. Import `ScheduleModule` (sekali saja, di root module):**

```typescript
// backend/src/app.module.ts
import { ScheduleModule } from '@nestjs/schedule';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    // ...modules lain
  ],
})
export class AppModule {}
```

**2. Definisikan task di provider dengan `@Cron()`:**

**Contoh nyata:** lihat `backend/src/modules/logs/logs.cron.ts` (`LogsCron`) — provider `@Injectable()` yang inject `Repository<LogEntity>` via `@InjectRepository()`, method `deleteOldLogs()` didekorasi `@Cron('0 0 * * *')` (jalan tiap hari jam 00:00), isinya menghapus log lebih dari 7 hari menggunakan `createQueryBuilder().delete()`.

```typescript
// backend/src/modules/{nama-modul}/{nama-modul}.cron.ts
import { Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { {Nama}Entity } from './entities/{nama}.entity';

@Injectable()
export class {Nama}Cron {
  constructor(
    @InjectRepository({Nama}Entity)
    private readonly repo: Repository<{Nama}Entity>,
  ) {}

  @Cron('0 0 * * *')
  async {namaTask}(): Promise<void> {
    // business logic terjadwal
  }
}
```

**3. Daftarkan provider di module:**

```typescript
// backend/src/modules/{nama-modul}/{nama-modul}.module.ts
@Module({
  imports: [TypeOrmModule.forFeature([{Nama}Entity])],
  providers: [{Nama}Cron],
})
export class {Nama}Module {}
```

**4. Pastikan container backend selalu hidup** (scheduler mati jika proses NestJS mati) — Docker Compose `restart: unless-stopped` sudah menangani auto-restart container; lihat `supervisor.md` hanya jika perlu process manager tambahan di dalam container.

### Cron Expression Reference

```
* * * * * *
│ │ │ │ │ │
│ │ │ │ │ └── Day of week (0-7, Sunday=0 or 7)
│ │ │ │ └──── Month (1-12)
│ │ │ └────── Day of month (1-31)
│ │ └──────── Hour (0-23)
│ └────────── Minute (0-59)
└──────────── Second (0-59) (optional)
```

### Decorator Alternatif

```typescript
@Cron('45 * * * * *')       // custom cron expression
@Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT) // preset expression
@Interval(10000)            // jalan tiap 10 detik
@Timeout(5000)               // jalan sekali, 5 detik setelah startup
```

---

## Verification

**Check container backend jalan (via Docker Compose):**
```bash
docker compose -f docker-compose.yml ps backend
```

**Check log aplikasi untuk konfirmasi cron jalan** (tambahkan `console.log`/logger di method `@Cron()` jika perlu):
```bash
docker compose -f docker-compose.yml logs -f backend | grep -i "{namaTask}"
```

**Test manual:** panggil method yang didekorasi `@Cron()` langsung lewat unit test atau endpoint debug sementara — `@nestjs/schedule` tidak menyediakan CLI "run now" bawaan, jadi verifikasi paling praktis adalah unit test terhadap method tersebut atau menunggu jadwal berikutnya di log.

---

## Troubleshooting

### Task terjadwal tidak jalan

**Symptom:** Task dengan `@Cron()` tidak pernah dieksekusi

**Solutions:**
1. Pastikan `ScheduleModule.forRoot()` di-import di `app.module.ts` (root module) — tanpa ini, semua `@Cron()` diabaikan.
2. Pastikan provider yang berisi `@Cron()` terdaftar di `providers: []` module terkait dan module tersebut di-import (langsung/transitif) oleh `AppModule`.
3. Cek container backend benar-benar hidup:
   ```bash
   docker compose -f docker-compose.yml ps backend
   ```
4. Cek cron expression valid (test di https://crontab.guru atau tulis ulang dengan `CronExpression` preset dari `@nestjs/schedule`).
5. Cek timezone server vs timezone yang diharapkan:
   ```bash
   timedatectl
   ```
   Set timezone eksplisit jika perlu: `@Cron('0 0 * * *', { timeZone: 'Asia/Jakarta' })`.

### Proses backend restart terus (task jadi tidak konsisten)

**Symptom:** Task kadang jalan kadang tidak, log menunjukkan proses restart berulang

**Solutions:**
1. Cek log crash aplikasi:
   ```bash
   docker compose -f docker-compose.yml logs -f backend --tail 100
   ```
2. Cek memory limit / OOM killer (`docker stats backend` atau `docker inspect backend` untuk melihat resource limit container).
3. Pastikan hanya **1 replica/instance** container backend yang berjalan jika task tidak idempotent (multi-instance menyebabkan task jalan dobel) — jangan scale backend service lebih dari 1 replica di Docker Compose tanpa guard tambahan (mis. distributed lock).

---

## Auto-Setup Script

**Script:** `backend/docs/operations/scripts/setup-scheduler.sh`

```bash
#!/bin/bash
# Verifikasi setup scheduler NestJS (@nestjs/schedule)

PROJECT_PATH="{project_path}/backend"

cd $PROJECT_PATH

# Pastikan dependency terpasang
npm ls @nestjs/schedule || npm install @nestjs/schedule

# Build & restart proses backend supaya ScheduleModule aktif
npm run build
sudo supervisorctl restart {project}-backend:*

echo "NestJS scheduler aktif mengikuti proses backend. Cek status:"
sudo supervisorctl status {project}-backend:*
```

**Run (auto-setup mode):**
```bash
bash backend/docs/operations/scripts/setup-scheduler.sh
```

**Run (manual-setup mode):**
```bash
# Copy commands dari script dan jalankan manual
```
