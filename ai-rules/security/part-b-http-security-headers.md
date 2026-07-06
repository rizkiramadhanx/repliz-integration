# HTTP Security Headers (Mandatory — Setup by AI)

> **IMMUTABLE -- AI TIDAK BOLEH mengubah file ini. Baca sebagai panduan. Untuk output, lihat mapping di ai-rules/README.md.**

> **Status:** GUIDANCE — Bagian dari security standard. Lihat [README.md](./README.md) untuk index lengkap.

###  AI WAJIB Setup di Setiap Project

Security headers HARUS dikonfigurasi di web server atau middleware framework. AI WAJIB mengaktifkannya tanpa diminta user.

| Header | Value | Purpose |
|--------|-------|---------|
| `X-Content-Type-Options` | `nosniff` | Mencegah MIME sniffing |
| `X-Frame-Options` | `DENY` atau `SAMEORIGIN` | Mencegah clickjacking |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | Kontrol referrer info |
| `Permissions-Policy` | `geolocation=(), microphone=(), camera=()` | Batasi API browser |
| `Strict-Transport-Security` | `max-age=31536000; includeSubDomains` | HSTS (production only) |
| `Cross-Origin-Opener-Policy` | `same-origin` | Mencegah cross-origin window attacks |
| `Cross-Origin-Embedder-Policy` | `require-corp` | Mencegah cross-origin resource loading |
| `Cross-Origin-Resource-Policy` | `same-origin` | Mencegah cross-origin resource theft |

**Additional headers:**
| Header | Value | Purpose |
|--------|-------|---------|
| `X-Permitted-Cross-Domain-Policies` | `none` | Mencegah Flash/PDF cross-domain access |
| `Clear-Site-Data` | `"cache", "cookies", "storage"` (on logout endpoint) | Clear all browser data saat user logout |

### Cookie Security Attributes

Semua cookie WAJIB memiliki atribut security:
| Attribute | Purpose |
|-----------|---------|
| `Secure` | Cookie hanya dikirim via HTTPS |
| `HttpOnly` | JavaScript TIDAK bisa access cookie (XSS protection) |
| `SameSite=Strict` atau `Lax` | Mencegah CSRF via cross-site request |

```typescript
// NestJS — cookie security (contoh set cookie di auth controller)
res.cookie('refresh_token', token, {
  secure: process.env.NODE_ENV === 'production', // HTTPS only
  httpOnly: true,                                 // No JS access
  sameSite: 'lax',                                // CSRF protection
});
```

**Note:** `X-XSS-Protection` sudah deprecated di browser modern (Chrome menghapusnya 2019). Jangan gunakan.

### Content Security Policy (CSP)

**Production (Strict):**
```nginx
# Nginx example — Production
add_header Content-Security-Policy "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data: https:; font-src 'self'; connect-src 'self' https:; frame-ancestors 'none'; base-uri 'self'; form-action 'self';" always;
```

**Development/Testing (Report-Only):**
```nginx
# Testing CSP sebelum enforce
add_header Content-Security-Policy-Report-Only "default-src 'self'; report-uri /csp-violation-report;" always;
```

**Jika butuh inline scripts (misal: analytics):**
```nginx
# Gunakan nonce atau hash, JANGAN unsafe-inline
add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'nonce-{random}';" always;
```

### Subresource Integrity (SRI)

**WAJIB** untuk external scripts/styles yang di-load dari CDN:

```html
<!-- Contoh benar: SRI pada external resource -->
<script src="https://cdn.example.com/library.js"
        integrity="sha384-oqVuAfXRKap7fdgcCY5uykM6+R9GqQ8K/uxy9rx7HNQlGYl1kPzQho1wx4JwY8wC"
        crossorigin="anonymous"></script>

<!-- Contoh SALAH: tanpa SRI — jika CDN compromised, attacker inject malicious code -->
<script src="https://cdn.example.com/library.js"></script>
```

**Generate SRI hash:**
```bash
curl https://cdn.example.com/library.js | openssl dgst -sha384 -binary | openssl base64 -A
```

```typescript
// NestJS — main.ts, gunakan helmet middleware
import helmet from 'helmet';

app.use(helmet());
app.use(
  helmet.hsts({
    maxAge: 31536000,
    includeSubDomains: true,
  }),
); // aktifkan hanya untuk production

// Atau custom middleware jika perlu header spesifik:
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader(
    'Permissions-Policy',
    'geolocation=(), microphone=(), camera=()',
  );
  next();
});
```

---

Kembali ke [Index](./README.md)
