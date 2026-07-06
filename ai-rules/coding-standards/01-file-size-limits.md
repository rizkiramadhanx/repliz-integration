# File Size Limits

> **IMMUTABLE -- AI TIDAK BOLEH mengubah file ini. Baca sebagai panduan. Untuk output, lihat mapping di ai-rules/README.md.**

> **Status:** WAJIB — Bagian dari coding standards. Lihat [CODING_STANDARDS.md](../CODING_STANDARDS.md) untuk index lengkap.

### Batas Maksimal Baris per File

| Jenis File | Maksimal Baris | Rekomendasi |
|------------|----------------|-------------|
| Controller | 1000 baris | 500 baris |
| Service/Business Logic | 800 baris | 400 baris |
| Model/Entity | 300 baris | 150 baris |
| Repository | 500 baris | 300 baris |
| Helper/Utility | 400 baris | 200 baris |
| Test File | 800 baris | 500 baris |
| Route File | 200 baris | 100 baris |
| View/Page Component | 500 baris | 300 baris |
| Partial/Component | 300 baris | 150 baris |

**Catatan Penting:**
- Batas di atas adalah **maksimal absolut**. Jika file mendekati batas, pertimbangkan refactor.
- **Separation of Concerns lebih penting dari line count**. Controller 800 baris dengan logic yang terstruktur lebih baik dari controller 200 baris yang campur aduk.
- Untuk project kompleks (multi-tenant, many roles, complex workflows), controller bisa lebih panjang selama tetap maintainable.
- Jika controller >1000 baris, **WAJIB** extract ke Service layer dan pertimbangkan split controller.
- Route file >200 baris **WAJIB** dipecah ke partials per module/sub-module.
- View/Page >500 baris **WAJIB** dipecah ke partials/components.

### Jika File Melebihi Batas

**WAJIB refactor dengan strategi berikut:**

1. **Extract ke Service Layer** - Pindahkan business logic ke Service class
2. **Extract ke Repository** - Pindahkan database queries ke Repository class
3. **Split Controller** - Bagi controller berdasarkan resource/domain
4. **Extract Helper Methods** - Pindahkan utility functions ke Helper class

**Contoh Refactoring:**

```typescript
// BEFORE: Controller 800+ baris
@Controller('employee')
export class EmployeeController {
  @Post()
  async store(@Body() body: any) {
    // 100 baris validation manual
    // 200 baris business logic
    // 80 baris query TypeORM langsung
    // 100 baris file handling
    // 80 baris notification
  }
}

// AFTER: Clean architecture
@Controller('employee')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class EmployeeController {
  constructor(private readonly employeeService: EmployeeService) {}

  @Post()
  @Permissions('employee:create')
  async store(@Body() dto: CreateEmployeeDto) {
    const employee = await this.employeeService.createEmployee(dto);
    return createSuccessResponse('Employee created', employee);
  }
}

@Injectable()
export class EmployeeService {
  constructor(
    @InjectRepository(EmployeeEntity)
    private readonly employeeRepo: Repository<EmployeeEntity>,
    private readonly notificationService: NotificationService,
  ) {}

  async createEmployee(dto: CreateEmployeeDto): Promise<EmployeeEntity> {
    const employee = await this.employeeRepo.save(this.employeeRepo.create(dto));
    await this.notificationService.sendWelcomeEmail(employee);
    return employee;
  }
}
```

---

Kembali ke [Index](../CODING_STANDARDS.md)
