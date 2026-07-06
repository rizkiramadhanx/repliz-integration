# Input Validation & Output Sanitization (Mandatory)

> **IMMUTABLE -- AI TIDAK BOLEH mengubah file ini. Baca sebagai panduan. Untuk output, lihat mapping di ai-rules/README.md.**

> **Status:** GUIDANCE — Bagian dari security standard. Lihat [README.md](./README.md) untuk index lengkap.

### Input

| Rule | Detail |
|------|--------|
| Validasi input | Semua input dari user WAJIB divalidasi (NestJS DTO + `class-validator` decorators seperti `@IsString()`, `@IsEmail()`, `@IsNotEmpty()`, di-enforce via `ValidationPipe`) |
| Whitelist approach | Definisikan apa yang BOLEH, bukan apa yang TIDAK BOLEH. Gunakan `ValidationPipe({ whitelist: true, forbidNonWhitelisted: true })` agar field di luar DTO otomatis ditolak |
| File upload | Max size, allowed extensions (`jpg,png,pdf` — bukan blacklist), scan MIME type. Gunakan `FileInterceptor` + `ParseFilePipe` dengan `FileTypeValidator` dan `MaxFileSizeValidator` |
| SQL Injection | Gunakan ORM (TypeORM query builder / repository) / prepared statements. JANGAN raw query dengan user input |
| Mass assignment | Gunakan DTO pattern (`class-validator`) — hanya field yang didefinisikan di DTO yang diterima, bukan `Object.assign` langsung dari request body |
| **Path Traversal** | Sanitize `../` dan `..\\` di semua file path input. Gunakan `path.resolve()` + validasi hasil masih di dalam base directory, atau `path.basename()` |
| **SSRF (Server-Side Request Forgery)** | Validasi dan whitelist URL/IP yang boleh diakses backend. Jangan fetch URL dari user input tanpa validasi |
| **Deserialization Attacks** | JANGAN deserialize untrusted data (Node `JSON.parse` dengan custom reviver, `eval()`, `vm` module dengan input user). Gunakan JSON yang aman dan skema tervalidasi |
| **XXE (XML External Entity)** | Disable external entities di XML parser. Jika pakai `xml2js`/`fast-xml-parser`, matikan resolusi entity eksternal |
| **Command Injection** | JANGAN gunakan `child_process.exec()` dengan string user input. Jika perlu, gunakan `execFile()`/`spawn()` dengan array argument, bukan string |
| **Race Conditions** | Gunakan database locks (FOR UPDATE) atau atomic operations untuk payment/inventory. Jangan check-then-act tanpa lock |
| **NoSQL Injection** | Validasi dan sanitize input untuk MongoDB, Firestore, dan document-based DB. Gunakan query operators yang aman, JANGAN concat user input ke query filter |
| **ReDoS (Regular Expression Denial of Service)** | Hindari regex pattern yang bisa exponential backtracking (nested quantifiers, overlapping groups). Gunakan atomic groups atau time-limited regex engine |
| **LDAP Injection** | Escape special characters (`*`, `(`, `)`, `\`, `/`) di LDAP query input. Gunakan parameterized LDAP queries |
| **Content-Type Validation** | Enforce Content-Type header pada request body (JSON API = `application/json`). Reject request dengan wrong Content-Type |

### Output

| Rule | Detail |
|------|--------|
| XSS prevention | React otomatis escape output JSX (`{value}`), jangan gunakan `dangerouslySetInnerHTML` tanpa sanitasi (mis. `DOMPurify`) |
| JSON response | Jangan expose stack trace di production (matikan `NODE_ENV=production`, gunakan global exception filter NestJS untuk generic error response) |
| Error message | Generic di production ("Server error"), detail di development |
| ID exposure | Pertimbangkan UUID sebagai ganti auto-increment ID di URL publik |
| **Data masking** | Mask sensitive data di logs dan UI (email: `j***@example.com`, phone: `08***1234`) |

---

Kembali ke [Index](./README.md)
