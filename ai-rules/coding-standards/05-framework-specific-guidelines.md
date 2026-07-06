# Framework-Specific Guidelines

> **IMMUTABLE -- AI TIDAK BOLEH mengubah file ini. Baca sebagai panduan. Untuk output, lihat mapping di ai-rules/README.md.**

> **Status:** WAJIB — Bagian dari coding standards. Lihat [CODING_STANDARDS.md](../CODING_STANDARDS.md) untuk index lengkap.

> **Stack project ini:** Backend NestJS + TypeORM, Frontend React (Vite) + Mantine + TanStack Query. Contoh di bawah diambil dari pola nyata di `backend/src/modules/roles/` dan `frontend/src/features/master-data/role/`.

### Backend — NestJS

#### Module-Controller-Service-Repository Pattern (WAJIB)

Setiap fitur adalah 1 module NestJS dengan struktur tetap:

```
src/modules/{feature}/
├── {feature}.module.ts
├── {feature}.controller.ts
├── {feature}.service.ts
├── {feature}.service.spec.ts
├── dto/{feature}.dto.ts
└── entities/{feature}.entity.ts
```

```typescript
// src/modules/roles/roles.module.ts
@Module({
  imports: [TypeOrmModule.forFeature([RoleEntity]), LogsModule],
  controllers: [RolesController],
  providers: [RolesService],
  exports: [RolesService],
})
export class RolesModule {}
```

#### Controller (WAJIB Guards + Permissions + Response Wrapper)

```typescript
// src/modules/roles/roles.controller.ts
@Controller('role')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class RolesController {
  constructor(
    private readonly rolesService: RolesService,
    private readonly logsService: LogsService,
  ) {}

  @Get()
  @Permissions('role:read')
  async all(
    @Query() paginationDto: PaginationDto,
    @CurrentUser() currentUser: CurrentUserType,
    @Res({ passthrough: true }) res: Response,
  ) {
    try {
      const result = await this.rolesService.list(paginationDto);
      await this.logsService.createLog({
        action: 'role:read',
        userId: currentUser.id,
        status: 'SUCCESS',
        statusCode: HttpStatus.OK,
      });
      res.status(HttpStatus.OK);
      return createSuccessResponse('Get all roles success', result.data, result.meta);
    } catch (err) {
      console.error('Failed get all roles', err);
      await this.logsService.createLog({
        action: 'role:read',
        userId: currentUser?.id,
        status: 'ERROR',
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      });
      res.status(HttpStatus.INTERNAL_SERVER_ERROR);
      return createErrorResponse('Failed to get roles', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
}
```

**Aturan wajib per endpoint:**
- `@UseGuards(JwtAuthGuard, PermissionsGuard)` di level controller
- `@Permissions('{module}:{action}')` per handler (`read`, `create`, `update`, `delete`)
- Validasi input via DTO (`class-validator`), bukan manual di controller
- Response selalu lewat `createSuccessResponse` / `createErrorResponse` (`src/common/type/response.ts`)
- Log setiap aksi via `LogsService.createLog(...)` (success dan error)
- `try/catch` di controller — jangan biarkan error mentah bocor ke client

#### Service (Business Logic + TypeORM Repository)

```typescript
// src/modules/roles/roles.service.ts
@Injectable()
export class RolesService {
  constructor(
    @InjectRepository(RoleEntity)
    private readonly roleRepo: Repository<RoleEntity>,
  ) {}

  async detailRole(roleId: string) {
    const role = await this.roleRepo.findOne({ where: { id: roleId } });
    if (!role) throw new NotFoundException('Role not found');
    const instance = plainToInstance(RoleResponseDto, role, { excludeExtraneousValues: true });
    return instanceToPlain(instance, { exposeDefaultValues: true });
  }
}
```

**Aturan wajib:**
- Akses data HANYA lewat `@InjectRepository(Entity)` TypeORM — jangan raw query kecuali kebutuhan khusus (dokumentasikan di ADR jika terjadi)
- Serialize response entity lewat DTO (`plainToInstance` + `instanceToPlain`, `excludeExtraneousValues: true`) — jangan return entity mentah (bisa bocorkan field sensitif)
- Business rule (mis. "Admin tidak boleh dihapus") ditaruh di service, bukan controller
- Lempar exception NestJS bawaan (`NotFoundException`, `ForbiddenException`, dll) — controller yang menangkap dan konversi ke response wrapper

#### DTO & Validation

```typescript
// src/modules/roles/dto/role.dto.ts
export class CreateRoleDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsArray()
  actions: string[];
}
```

- Semua request body/query WAJIB divalidasi via DTO + `class-validator`
- Response DTO terpisah dari request DTO (`RoleResponseDto` vs `CreateRoleDto`) — pakai `@Expose()`/`excludeExtraneousValues` untuk kontrol field yang keluar

### Frontend — React (Vite) + Mantine + TanStack Query

#### Feature-Based Folder Structure (WAJIB)

Setiap fitur ada di `src/features/{group}/{feature}/`, bukan dikelompokkan per jenis file:

```
src/features/master-data/role/
├── page-role.tsx           ← Halaman utama (list + orchestration)
├── type.ts                 ← Semua type/interface fitur ini
├── components/              ← Komponen spesifik fitur (modal add/edit, dll)
│   ├── modal-add-role.tsx
│   └── modal-edit-role.tsx
└── hooks/                    ← Data-fetching hooks, 1 file per operasi
    ├── useGetAllRole.tsx
    ├── useGetRoleDetail.tsx
    ├── useMutateAddRole.tsx
    ├── useMutateEditRole.tsx
    └── useMutateDeleteRole.tsx
```

#### Data Fetching — 1 Hook per Operasi (WAJIB)

```typescript
// hooks/useGetAllRole.tsx — query
export default function useGetAllRole({ page = 1, limit = 25, keyword = "" }: typeDataGetAllRoleParams) {
  return useQuery({
    queryKey: ["role", page, limit, keyword],
    queryFn: async () => {
      const response = await axiosInstanceAPI.request<typeDataCommonResponse<typeDataRole[]>>({
        method: "GET",
        url: "/api/role",
        params: { page, limit, keyword },
      });
      return response;
    },
  });
}

// hooks/useMutateAddRole.tsx — mutation
export default function useMutateAddRole() {
  return useMutation({
    mutationFn: async (payload: typeDataCreateRolePayload) => {
      const response = await axiosInstanceAPI.request<typeDataCreateRoleResponse>({
        method: "POST",
        url: "/api/role",
        data: payload,
      });
      return response.data;
    },
  });
}
```

**Aturan wajib:**
- JANGAN fetch data langsung di komponen dengan `useEffect` — selalu lewat hook `useQuery`/`useMutation` khusus
- 1 file hook = 1 operasi (`useGetAllRole`, `useMutateAddRole`, dst) — jangan gabung banyak operasi dalam 1 hook
- Semua request lewat `axiosInstanceAPI` (`src/libs/axios.ts`) — jangan `fetch()` langsung
- `queryKey` WAJIB menyertakan semua parameter filter agar cache tidak stale
- Refetch manual (`refetch()`) setelah mutation sukses, jangan andalkan auto-invalidate kecuali sudah setup `queryClient.invalidateQueries`

#### Page Component (Orchestration Only)

```tsx
// page-role.tsx
export default function PageRole() {
  const [filter, setFilter] = useState({ keyword: "", page: 1, limit: 25 });
  const { data: dataRole, isLoading, refetch, isSuccess } = useGetAllRole(filter);
  const { mutate: deleteRole, isPending } = useMutateDeleteRole();

  const onSuccessAdd = () => {
    setOpenAdd(false);
    refetch();
    notifications.show({ title: "Sukses", message: "Role berhasil ditambahkan", color: "green" });
  };

  return (
    <Box px={20} py={10}>
      {/* ...Mantine components: Table, Pagination, Input search... */}
      <ModalAddRole open={openAdd} onClose={() => setOpenAdd(false)} onSuccess={onSuccessAdd} />
    </Box>
  );
}
```

**Aturan wajib:**
- Page component HANYA orkestrasi (state, panggil hook, render) — logic kompleks pindahkan ke hook/util
- Form tambah/edit WAJIB di komponen modal terpisah (`components/modal-add-{feature}.tsx`), bukan inline di page
- Notifikasi sukses/error pakai `notifications.show()` dari `@mantine/notifications` — konsisten di seluruh app
- Search input WAJIB pakai `useDebounceCallback` (`src/hooks/useDebounceCallback.tsx`), jangan fetch tiap keystroke
- Delete WAJIB lewat `ModalDeleteConfirmation` (`src/components/moleculs/modal/`) — jangan delete langsung tanpa konfirmasi
- UI components dari Mantine (`@mantine/core`) — jangan bikin komponen custom yang sudah tersedia di Mantine

#### Type Definitions

```typescript
// type.ts — semua type 1 fitur dalam 1 file, prefix "typeData"
export type typeDataRole = {
  id: string;
  name: string;
  actions: string[];
  created_at: string;
  updated_at: string;
};

export type typeDataCreateRolePayload = {
  name: string;
  actions: string[];
};
```

- Naming convention: `typeData{Entity}` untuk response, `typeDataCreate{Entity}Payload` / `typeDataUpdate{Entity}Payload` untuk request
- Semua type 1 fitur ditaruh di `type.ts` fitur tersebut — jangan sebar di banyak file

---

Kembali ke [Index](../CODING_STANDARDS.md)
