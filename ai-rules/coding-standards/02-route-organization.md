# Route Organization

> **IMMUTABLE -- AI TIDAK BOLEH mengubah file ini. Baca sebagai panduan. Untuk output, lihat mapping di ai-rules/README.md.**

> **Status:** WAJIB — Bagian dari coding standards. Lihat [CODING_STANDARDS.md](../CODING_STANDARDS.md) untuk index lengkap.

### Prinsip Dasar

- **1 module NestJS = 1 controller = 1 domain/resource** (controller maksimal 200 baris untuk route definitions; logic ada di service, lihat [05](./05-framework-specific-guidelines.md))
- **1 route file React = 1 group module** (maksimal 200 baris), dikelompokkan berdasarkan domain bisnis (`master-data`, `authentication`, `log`, dst), bukan berdasarkan HTTP method
- Setiap module/group route WAJIB terdaftar di 1 titik aggregator (`app.module.ts` untuk backend, `routes/index.tsx` untuk frontend)

### Backend — NestJS

```
src/modules/
├── auth/
│   ├── auth.module.ts
│   ├── auth.controller.ts           (route definitions — login, register, refresh)
│   └── auth.service.ts
├── roles/
│   ├── roles.module.ts
│   ├── roles.controller.ts          (@Controller('role') — CRUD role)
│   └── roles.service.ts
├── users/
│   ├── users.module.ts
│   ├── users.controller.ts
│   └── users.service.ts
└── items/
    ├── items.module.ts
    ├── items.controller.ts
    └── items.service.ts
```

**Contoh app.module.ts (aggregator):**
```typescript
@Module({
  imports: [
    ScheduleModule.forRoot(),
    LogsModule,
    AuthModule,
    UsersModule,
    MailModule,
    RolesModule,
    ItemsModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    { provide: APP_INTERCEPTOR, useClass: LoggingInterceptor },
  ],
})
export class AppModule {}
```

**Contoh roles.controller.ts (1 controller = 1 resource, prefix via `@Controller`):**
```typescript
@Controller('role')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  @Get()
  @Permissions('role:read')
  async all(@Query() paginationDto: PaginationDto) { /* ... */ }

  @Post()
  @Permissions('role:create')
  async create(@Body() dto: CreateRoleDto) { /* ... */ }

  @Patch(':roleId')
  @Permissions('role:update')
  async update(@Param('roleId', ParseUUIDPipe) roleId: string, @Body() dto: UpdateRoleDto) { /* ... */ }

  @Delete(':roleId')
  @Permissions('role:delete')
  async remove(@Param('roleId', ParseUUIDPipe) roleId: string) { /* ... */ }
}
```

**Aturan wajib:**
- 1 controller = 1 resource/domain (`role`, `user`, `item`) — jangan gabung banyak resource tidak terkait dalam 1 controller
- Prefix path via `@Controller('{resource}')`, bukan hardcode path penuh di tiap `@Get()`/`@Post()`
- Module baru WAJIB didaftarkan di `app.module.ts` (`imports`) saat dibuat

### Frontend — React Router

```
src/routes/
├── index.tsx                        (aggregator — useRoutes gabungan semua group)
├── authentication.tsx                (route login, register, forgot-password)
├── master-data.tsx                   (route group /master-data/* : user, role, item, category, brand)
└── log.tsx                           (route group /log)
```

**Contoh routes/index.tsx (aggregator):**
```tsx
function AllRoutes() {
  const routes = useRoutes([
    ...AuthenticationRoutes,
    ...MasterDataRoutes,
    ...LogRoutes,
    { path: "*", element: <NotFound /> },
  ]);
  return routes;
}
```

**Contoh routes/master-data.tsx (1 file = 1 group domain):**
```tsx
const MasterDataRoutes: RouteObject[] = [
  {
    path: "/master-data",
    element: (
      <ProtectedLayout>
        <DashboardLayout />
      </ProtectedLayout>
    ),
    children: [
      { index: true, element: <h2>Master Data</h2> },
      { path: "user", element: <PageUser /> },
      { path: "role", element: <PageRole /> },
      { path: "item", element: <PageItem /> },
      { path: "category", element: <PageCategory /> },
      { path: "brand", element: <PageBrand /> },
    ],
  },
];

export default MasterDataRoutes;
```

**Aturan wajib:**
- 1 file route = 1 group domain (`master-data`, `authentication`, `log`) — bukan 1 file per page
- Setiap `path` children mengarah ke `Page{Feature}` dari `src/features/{group}/{feature}/page-{feature}.tsx` — jangan definisikan komponen inline di file route
- Group route baru WAJIB didaftarkan di `routes/index.tsx`
- Proteksi akses lewat wrapper layout (`ProtectedLayout`, `DashboardLayout`, `GuestLayout`) di level route group, bukan di tiap page

---

Kembali ke [Index](../CODING_STANDARDS.md)
