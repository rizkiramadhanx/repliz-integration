# Authentication Flow (Project-Specific)

> **IMMUTABLE -- AI TIDAK BOLEH mengubah file ini. Baca sebagai panduan. Untuk output, lihat mapping di ai-rules/README.md.**

> **Status:** GUIDANCE — Bagian dari security standard. Lihat [README.md](./README.md) untuk index lengkap.

**Isi oleh AI setelah menganalisis auth system project (backend NestJS pakai `@nestjs/jwt`, lihat `backend/src/modules/auth/`):**

- Token-based (JWT) — bukan session-based. Access token + refresh token?
- Bagaimana token disimpan di frontend (localStorage, cookie httpOnly, Zustand store)?
- Apakah ada multi-guard (`JwtAuthGuard` + `PermissionsGuard` — lihat `backend/src/modules/auth/guards/`)?
- Apakah ada SSO/OAuth?
- Bagaimana refresh token / auto-logout saat expired ditangani di frontend?

```
[Login Form (React + Mantine)] → [useMutateLogin hook] → [POST /api/auth/login] → [AuthController] → [AuthService: validate + sign JWT] → [Response: access_token] → [Frontend: simpan token, redirect via react-router]
```

Request berikutnya: `[axiosInstanceAPI (Bearer token)] → [JwtAuthGuard] → [PermissionsGuard (@Permissions)] → [Controller]`

---

Kembali ke [Index](./README.md)
