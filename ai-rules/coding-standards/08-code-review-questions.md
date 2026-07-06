# Code Review Questions

> **IMMUTABLE -- AI TIDAK BOLEH mengubah file ini. Baca sebagai panduan. Untuk output, lihat mapping di ai-rules/README.md.**

> **Status:** WAJIB — Bagian dari coding standards. Lihat [CODING_STANDARDS.md](../CODING_STANDARDS.md) untuk index lengkap.

Sebelum menyelesaikan task, AI WAJIB bertanya pada diri sendiri:

1. **Apakah file ini terlalu besar?** (> 1000 baris untuk controller, > 500 baris untuk page component)
2. **Apakah function ini terlalu panjang?** (> 50 baris)
3. **Apakah class/component ini punya terlalu banyak tanggung jawab?**
4. **Apakah ada code yang bisa di-extract ke Service (backend) atau hook/component (frontend)?**
5. **Apakah validation sudah dipisahkan ke DTO (`class-validator`) atau `@mantine/form`?**
6. **Apakah ada business logic di Controller atau Page component?**
7. **Apakah ada query TypeORM langsung di Controller, atau `fetch`/`axios` langsung di komponen React?**
8. **Apakah code ini mudah di-test?**
9. **Apakah code ini mudah dipahami developer lain?**
10. **Apakah code ini mengikuti konvensi NestJS/React project ini?** (lihat [05](./05-framework-specific-guidelines.md))

Jika jawaban "TIDAK" untuk pertanyaan 1-4 atau "YA" untuk pertanyaan 5-8, **WAJIB refactor sebelum commit**.

---

Kembali ke [Index](../CODING_STANDARDS.md)
