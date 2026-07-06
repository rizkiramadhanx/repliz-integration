# Migration Guide - PostgreSQL

## Setup Migration

### 1. Install Dependencies

```bash
npm install
```

### 2. Setup Environment Variables

Buat file `.env` di root project dengan konfigurasi:

### 1. Start PostgreSQL Database

```bash
# Menggunakan Docker Compose
docker-compose up -d postgres

# Atau install PostgreSQL lokal dan buat database
createdb crudnest
```

### 2. Run Migration

```bash
# Jalankan migration
npm run migration:run

# Cek status migration
npm run migration:show

# Revert migration (jika perlu)
npm run migration:revert
```

### 3. Generate Migration Baru (jika ada perubahan entity)

```bash
# Generate migration otomatis
npm run migration:generate -- src/migration/NamaMigration

# Atau buat migration manual
npm run migration:create -- src/migration/NamaMigration
```

## Commands Available

```bash
# Migration commands
npm run migration:run      # Jalankan migration
npm run migration:revert   # Rollback migration
npm run migration:show     # Tampilkan status migration
npm run migration:generate # Generate migration dari entity
npm run migration:create   # Buat migration manual

# Development
npm run start:dev         # Start development server
npm run build            # Build production
npm run start:prod       # Start production server
```

## Troubleshooting

### Database Connection Error

- Pastikan PostgreSQL running
- Cek environment variables di .env
- Pastikan database `crudnest` sudah dibuat

### Migration Error

- Pastikan database kosong untuk initial migration
- Cek entity definitions sudah benar
- Pastikan TypeORM config sudah sesuai

### Permission Error

- Pastikan user database punya permission CREATE, DROP, ALTER
- Cek PostgreSQL user roles
