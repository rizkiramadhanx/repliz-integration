# Refactoring Checklist

> **IMMUTABLE -- AI TIDAK BOLEH mengubah file ini. Baca sebagai panduan. Untuk output, lihat mapping di ai-rules/README.md.**

> **Status:** WAJIB — Bagian dari coding standards. Lihat [CODING_STANDARDS.md](../CODING_STANDARDS.md) untuk index lengkap.

Sebelum commit, AI WAJIB memeriksa:

- [ ] **File size**: Tidak ada file yang melebihi batas maksimal
- [ ] **Function size**: Tidak ada function yang > 50 baris
- [ ] **Class responsibilities**: Setiap class hanya punya 1 tanggung jawab
- [ ] **Dependencies**: Inject dependencies via constructor (NestJS DI), jangan instantiate langsung
- [ ] **Validation**: Gunakan DTO + `class-validator` (backend) atau `@mantine/form` (frontend) — jangan validasi manual
- [ ] **Business logic**: Tidak ada business logic di Controller atau Page component
- [ ] **Database queries**: Tidak ada query TypeORM langsung di Controller — hanya lewat Service
- [ ] **Data fetching**: Tidak ada `fetch`/`axios` langsung di komponen React — hanya lewat hook `useQuery`/`useMutation`
- [ ] **Error handling**: Proper error handling dengan NestJS exceptions (`NotFoundException`, dll) dan response wrapper
- [ ] **Code duplication**: Extract duplicated code ke helper/service/hook
- [ ] **Comments**: Jelaskan WHY, bukan WHAT

---

Kembali ke [Index](../CODING_STANDARDS.md)
