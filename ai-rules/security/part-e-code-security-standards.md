# Code Security Standards (Mandatory)

> **IMMUTABLE -- AI TIDAK BOLEH mengubah file ini. Baca sebagai panduan. Untuk output, lihat mapping di ai-rules/README.md.**

> **Status:** GUIDANCE — Bagian dari security standard. Lihat [README.md](./README.md) untuk index lengkap.

###  AI WAJIB mengikuti saat menulis kode:

1. **Dependency audit:** Jalankan audit sebelum install package baru.
   ```bash
   npm audit    # backend (NestJS) & frontend (React)
   ```

2. **No eval / dynamic execution:**
   ```typescript
   // ❌ JANGAN
   eval(userInput);
   child_process.exec(userInput);

   // ✅ GUNAKAN
   // Whitelist command yang sudah ditentukan, atau execFile()/spawn() dengan array argument
   ```

3. **CORS configuration:** Jangan `Access-Control-Allow-Origin: *` di production. Whitelist domain yang diizinkan.

4. **File upload security:**
   - Simpan di luar `public/` directory
   - Gunakan random filename (jangan pakai nama asli user)
   - Validasi MIME type, bukan hanya extension
   - Batasi ukuran file

5. **Rate limiting:** Semua endpoint API WAJIB pakai rate limit. Default: 60 req/min.

6. **Logging:** 
   - Jangan log credential, token, atau data sensitif user
   - **Specific sensitive data yang TIDAK BOLEH di-log:**
     - Passwords, API keys, tokens
     - Credit card numbers, SSN, NIK
     - Full email addresses (mask: `j***@example.com`)
     - Phone numbers (mask: `08***1234`)
   - Log security events: login success/failure, permission denied, data access

7. **HTTPS enforcement:** Production WAJIB HTTPS. Redirect HTTP → HTTPS.

8. **Database backup encryption:** Jika backup DB disimpan di cloud/storage, pastikan terenkripsi.

9. **Dependencies up-to-date:** AI WAJIB cek `npm outdated` setiap milestone (backend & frontend) dan usulkan upgrade jika ada security patch.

10. **SAST (Static Application Security Testing):**
    ```bash
    # TypeScript compiler strict mode (tsc --noEmit) — wajib aktif di tsconfig.json
    npx tsc --noEmit

    # ESLint dengan security plugin
    npx eslint . --ext .ts,.tsx
    npx eslint-plugin-security
    npx njsscan .
    ```

11. **DAST (Dynamic Application Security Testing):**
    - Gunakan OWASP ZAP atau Burp Suite untuk penetration testing
    - Run DAST minimal 1x per bulan untuk production
    - Integrate ke CI/CD pipeline

12. **Secure random number generation:**
    ```typescript
    // ❌ JANGAN
    const token = Math.random().toString(36);

    // ✅ GUNAKAN (cryptographically secure)
    import { randomBytes, randomInt } from 'crypto';

    const token = randomBytes(32).toString('hex');
    const id = randomInt(1, Number.MAX_SAFE_INTEGER);
    ```

13. **Timing attacks prevention:**
    ```typescript
    // ❌ JANGAN (timing leak)
    if (userInput === secretToken) { // short-circuit evaluation
      // ...
    }

    // ✅ GUNAKAN (constant-time comparison)
    import { timingSafeEqual } from 'crypto';

    const a = Buffer.from(userInput);
    const b = Buffer.from(secretToken);
    if (a.length === b.length && timingSafeEqual(a, b)) {
      // ...
    }
    ```

14. **Integer overflow/underflow:**
    - Validasi range untuk semua integer input
    - Gunakan `Number.MAX_SAFE_INTEGER` checks, atau `BigInt` untuk angka besar (mis. saldo/inventory dalam satuan terkecil)
    - Hati-hati dengan operasi matematika di payment/inventory

15. **Third-party dependency verification:**
    - Verifikasi checksum/signature package sebelum install
    - Gunakan lock files (`package-lock.json`)
    - Review changelog sebelum upgrade major version
    - Hindari package dengan < 1000 downloads atau tidak maintained > 2 tahun

---

Kembali ke [Index](./README.md)
