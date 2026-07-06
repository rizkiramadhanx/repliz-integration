import { DataSource } from 'typeorm';
import { config } from 'dotenv';
import { UserEntity } from '../modules/users/entities/user.entity';
import { RoleEntity } from '../modules/roles/entities/role.entity';
import { LogEntity } from '../modules/logs/entities/log.entity';
import { ItemEntity } from '../modules/items/entities/item.entity';
import { CategoryEntity } from '../modules/items/entities/category.entity';
import { BrandEntity } from '../modules/items/entities/brand.entity';

config();

export default new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT) || 5432,
  username: process.env.DB_USERNAME || 'postgres',
  password: process.env.DB_PASSWORD || 'password',
  database: process.env.DB_NAME || 'crudnest',
  entities: [
    UserEntity,
    RoleEntity,
    LogEntity,
    ItemEntity,
    CategoryEntity,
    BrandEntity,
  ],
  migrations: ['src/migration/*.ts'],
  synchronize: false,
  logging: true,
});
