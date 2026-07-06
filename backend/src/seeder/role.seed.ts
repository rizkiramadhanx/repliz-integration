import { DataSource } from 'typeorm';
import { RoleEntity } from '../modules/roles/entities/role.entity';
import ACTION_ROLES from '../constant/action-roles';
import { Seeder } from './seeder-runner';

// Semua action yang tersedia di sistem — dipakai oleh role Admin.
const ALL_ACTIONS: string[] = ACTION_ROLES.flatMap((group) => group.actions);

const ROLES: { name: string; actions: string[] }[] = [
  {
    // Admin — bypass semua permission via guard (name === 'Admin'),
    // tapi tetap diberi full actions biar eksplisit & konsisten.
    name: 'Admin',
    actions: ALL_ACTIONS,
  },
  {
    // Manajer — semua aksi kecuali kelola role & user
    name: 'Manajer',
    actions: [
      'user:read',
      'log:read',
      'item:create',
      'item:read',
      'item:update',
      'item:delete',
      'category:create',
      'category:read',
      'category:update',
      'category:delete',
      'brand:create',
      'brand:read',
      'brand:update',
      'brand:delete',
    ],
  },
  {
    // Operator — hanya lihat data master (dipakai untuk operasional antrian)
    name: 'Operator',
    actions: ['item:read', 'category:read', 'brand:read'],
  },
];

export default class RoleSeed implements Seeder {
  async run(dataSource: DataSource): Promise<void> {
    const roleRepo = dataSource.getRepository(RoleEntity);

    for (const roleData of ROLES) {
      const existing = await roleRepo.findOne({
        where: { name: roleData.name },
      });

      if (!existing) {
        const role = roleRepo.create(roleData);
        await roleRepo.save(role);
        console.log(
          `  + Created role: ${role.name} (${role.actions.length} actions)`,
        );
      } else {
        existing.actions = roleData.actions;
        await roleRepo.save(existing);
        console.log(
          `  ~ Updated role: ${existing.name} (${existing.actions.length} actions)`,
        );
      }
    }
  }
}
