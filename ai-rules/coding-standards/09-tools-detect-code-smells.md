# Tools untuk Detect Code Smells

> **IMMUTABLE -- AI TIDAK BOLEH mengubah file ini. Baca sebagai panduan. Untuk output, lihat mapping di ai-rules/README.md.**

> **Status:** WAJIB — Bagian dari coding standards. Lihat [CODING_STANDARDS.md](../CODING_STANDARDS.md) untuk index lengkap.

### Backend (NestJS)

```bash
cd backend

# ESLint — coding standards + code smells
npm run lint

# TypeScript compiler check (tanpa emit)
npx tsc --noEmit

# Jest — unit test
npm run test
npm run test:cov
```

### Frontend (React/Vite)

```bash
cd frontend

# ESLint
npm run lint

# TypeScript compiler check (project build juga menjalankan ini)
npx tsc -b --noEmit
```

---

Kembali ke [Index](../CODING_STANDARDS.md)
