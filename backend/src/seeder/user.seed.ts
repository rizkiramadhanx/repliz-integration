import { DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { UserEntity } from '../modules/users/entities/user.entity';
import { RoleEntity } from '../modules/roles/entities/role.entity';
import { Seeder } from './seeder-runner';

export default class UserSeed implements Seeder {
  async run(dataSource: DataSource): Promise<void> {
    const roleRepo = dataSource.getRepository(RoleEntity);
    const userRepo = dataSource.getRepository(UserEntity);

    // Upsert roles (referensi — detail actions di-handle oleh role.seed.ts)
    const roles = [
      { name: 'Admin', actions: [] },
      { name: 'Operator', actions: [] },
    ];

    const savedRoles: Record<string, RoleEntity> = {};
    for (const roleData of roles) {
      let role = await roleRepo.findOne({ where: { name: roleData.name } });
      if (!role) {
        role = roleRepo.create(roleData);
        await roleRepo.save(role);
        console.log(`  + Created role: ${role.name}`);
      } else {
        console.log(`  ~ Role already exists: ${role.name}`);
      }
      savedRoles[role.name] = role;
    }

    // Upsert users
    const users = [
      {
        email: 'admin@example.com',
        name: 'Admin',
        password: 'Admin123!',
        isConfirmed: true,
        role: savedRoles['Admin'],
      },
      {
        email: 'operator@example.com',
        name: 'Operator',
        password: 'Operator123!',
        isConfirmed: true,
        role: savedRoles['Operator'],
      },
    ];

    for (const userData of users) {
      const existing = await userRepo.findOne({
        where: { email: userData.email },
      });

      if (!existing) {
        const hashed = await bcrypt.hash(userData.password, 10);
        const user = userRepo.create({ ...userData, password: hashed });
        await userRepo.save(user);
        console.log(`  + Created user: ${user.email}`);
      } else {
        console.log(`  ~ User already exists: ${userData.email}`);
      }
    }
  }
}
