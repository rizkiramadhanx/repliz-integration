# Pre-Development Checklist — Template & UI Readiness

> **Status:** TEMPLATE — Copy file ini ke `planning/PRE_DEVELOPMENT_CHECKLIST.md` dan isi sebelum mulai development.
> **Purpose:** Memastikan semua persiapan template dan UI sudah lengkap sebelum AI mulai coding.

---

## IMMUTABLE -- AI TIDAK BOLEH MENGUBAH FILE INI. Baca template ini, lalu BUAT file BARU di folder output (dev-docs/, planning/, dll) -- JANGAN ubah template ini.

**Kapan checklist ini diisi:**
- Sebelum mulai development (setelah `planning/PROJECT_BRIEF.md` selesai)
- Saat ada perubahan template atau UI framework
- Saat onboarding ke project existing yang menggunakan template

**Siapa yang mengisi:**
- AI agent (berdasarkan analisis `PROJECT_BRIEF.md` dan `PROJECT_CONTEXT.md`)
- Verifikasi oleh user jika ada ambiguitas

---

##  CRITICAL: UI/UX Template Readiness

### A. Template Declaration Check

**Lihat `planning/PROJECT_BRIEF.md` section "2b. UI/UX Template & Design System":**

- [ ] Section "2b" sudah diisi lengkap
- [ ] Status template sudah jelas: **YA** (HTML template tersedia) atau **TIDAK** (tidak ada template)
- [ ] Jika **YA**: Nama template, versi, dan lokasi folder sudah disebutkan
- [ ] Jika **TIDAK**: Framework UI yang akan dipakai sudah dipilih (Bootstrap, Tailwind, dll)

---

### B. Jika Template HTML = YA (User menyediakan template)

#### B.1. Template Files Presence

**Cek apakah file template sudah ada di `dev-docs/reference/template/`:**

- [ ] Folder `dev-docs/reference/template/{nama-template}/` sudah ada
- [ ] File `README.md` di folder template sudah ada (dokumentasi struktur & komponen)
- [ ] File HTML/CSS/JS template sudah lengkap (tidak ada file yang hilang)
- [ ] Assets (images, fonts, icons) sudah lengkap

**Jika file tidak lengkap:**
- [ ] User sudah dihubungi untuk provide file yang kurang
- [ ] Development **DITUNDA** sampai file template lengkap

#### B.2. Template Documentation

**AI WAJIB membaca dan memahami:**

- [ ] `dev-docs/reference/template/{nama}/README.md` sudah dibaca
- [ ] Struktur folder template sudah dipahami (di mana layout, components, pages)
- [ ] Daftar komponen available sudah dicatat (navbar, sidebar, cards, tables, forms, dll)
- [ ] Naming convention template sudah dipahami (class names, ID patterns)
- [ ] Cara customize/extend komponen sudah dipahami

#### B.3. Template Components Mapping

**AI WAJIB mapping kebutuhan UI ke komponen template:**

- [ ] List semua halaman yang akan dibuat (dari `planning/PRD.md` atau `planning/wireframe.md`)
- [ ] Untuk setiap halaman, identifikasi komponen template yang akan dipakai
- [ ] Dokumentasikan mapping di `dev-docs/modules/{modul}/views.md`
- [ ] Identifikasi komponen yang perlu di-customize (jika fitur tidak tersedia di template)

**Contoh mapping (template HTML di-port jadi komponen React):**
```
Halaman: Dashboard Admin
- Layout: template/layouts/default.html → di-port jadi <AppShell> React (sidebar + header + content)
- Komponen:
  - Stat cards: template/components/cards/stat.html → React component StatCard
  - Chart: template/components/charts/apex.html → React component pakai ApexCharts/Recharts
  - Table: template/components/tables/datatables.html → React component pakai TanStack Table
- Custom: Widget recent activities (tidak ada di template, perlu dibuat sebagai komponen React baru)
```

#### B.4. Template Rules Acknowledgment

**AI WAJIB konfirmasi paham aturan template:**

- [ ] ✅ **WAJIB** menggunakan struktur HTML, CSS, dan komponen dari template
- [ ] ✅ **WAJIB** mengikuti naming convention dan class names dari template
- [ ] ❌ **DILARANG** membuat UI components sendiri yang sudah ada di template
- [ ] ❌ **DILARANG** override styling template kecuali sangat diperlukan
- [ ] ✅ **BOLEH** extend/customize komponen template jika fitur tidak tersedia

**Konfirmasi AI:**
> "Saya sudah membaca dan memahami aturan penggunaan template HTML. Saya akan menggunakan komponen yang tersedia di template dan mengikuti konvensi yang ditetapkan."

---

### C. Jika Template HTML = TIDAK (User tidak menyediakan template)

#### C.1. Framework UI Selection

**Cek apakah framework UI sudah dipilih:**

- [ ] Framework UI sudah dipilih (lihat `PROJECT_BRIEF.md` section "2b")
- [ ] Versi framework sudah disebutkan
- [ ] Framework sudah di-install di project (atau akan di-install saat setup)

**Component library project ini (default, tidak perlu pilih ulang):**
- ✅ Mantine (`@mantine/core`, `@mantine/hooks`, `@mantine/form`, `@mantine/notifications`)
- ❌ **DILARANG** membuat CSS framework custom dari nol
- ❌ **DILARANG** menambah component library lain (Bootstrap, Ant Design, dll) tanpa persetujuan eksplisit — hindari duplikasi/inkonsistensi UI

#### C.2. Framework Best Practices

**AI WAJIB mengikuti best practices framework:**

- [ ] Layout system Mantine sudah dipahami (Grid, Flex, AppShell, Stack/Group)
- [ ] Component library Mantine sudah dipahami (Button, TextInput, Table, Modal, Select, dll)
- [ ] Style props & theme Mantine sudah dipahami (spacing, typography, colors via `theme`)
- [ ] Responsive design patterns Mantine sudah dipahami (breakpoints via `useMediaQuery`, style props responsif)

#### C.3. Framework Rules Acknowledgment

**AI WAJIB konfirmasi paham aturan framework:**

- [ ] ✅ **WAJIB** menggunakan framework UI yang dipilih
- [ ] ✅ **WAJIB** mengikuti best practices framework
- [ ] ❌ **DILARANG** membuat CSS framework custom dari nol
- [ ] ✅ **BOLEH** membuat custom CSS hanya untuk komponen yang tidak ada di framework
- [ ] ✅ **BOLEH** menggunakan pre-built components dari framework

**Konfirmasi AI:**
> "Saya sudah memahami aturan penggunaan framework UI. Saya akan menggunakan komponen dan utilities yang tersedia di framework dan mengikuti best practices yang ditetapkan."

---

### D. UI/UX Design System (Opsional tapi Disarankan)

**Jika user menyediakan style guide atau design system:**

- [ ] Style guide sudah dibaca (lihat `dev-docs/reference/branding/style-guide.pdf` jika ada)
- [ ] Color palette sudah dipahami (primary, secondary, accent colors)
- [ ] Typography sudah dipahami (font family, sizes, weights)
- [ ] Spacing system sudah dipahami (margins, paddings, grid gaps)
- [ ] Icon library sudah dipilih (Font Awesome, Material Icons, Heroicons, dll)

---

### E. Verification & Approval

**Sebelum mulai development, AI WAJIB:**

- [ ] Semua checklist di atas sudah dicentang (sesuai kondisi: template YA atau TIDAK)
- [ ] `dev-docs/ai/PROJECT_CONTEXT.md` section "UI/UX Template & Framework" sudah diisi
- [ ] User sudah approve persiapan template (jika ada ambiguitas)

**Konfirmasi AI:**
> "Semua persiapan template dan UI sudah lengkap. Saya siap memulai development dengan mengikuti aturan template yang telah ditetapkan."

---

## 📋 Quick Reference: Template vs Framework Rules

| Kondisi | Aturan | Dilarang |
|---------|--------|----------|
| **Template HTML = YA** | Gunakan komponen template, ikuti konvensi template | Buat UI sendiri, override styling template |
| **Template HTML = TIDAK** (default) | Gunakan Mantine component library | Buat CSS framework custom dari nol |

---

##  Referensi

- **Template Declaration:** `planning/PROJECT_BRIEF.md` section "2b. UI/UX Template & Design System"
- **Template Context:** `dev-docs/ai/PROJECT_CONTEXT.md` section "UI/UX Template & Framework"
- **Template Files:** `dev-docs/reference/template/` (jika template HTML = YA)
- **Agents Rules:** `AGENTS.md` section "1) Aturan Keras" rule #10

---

**Last Updated:** {YYYY-MM-DD}
