import { join } from 'path';
import { DataSource } from 'typeorm';
import { config } from 'dotenv';
import { UserEntity } from '../modules/users/entities/user.entity';
import { RoleEntity } from '../modules/roles/entities/role.entity';
import { LogEntity } from '../modules/logs/entities/log.entity';
import { AccountEntity } from '../modules/accounts/entities/account.entity';
import { AccountDelegationEntity } from '../modules/accounts/entities/account-delegation.entity';
import { ReplizSyncRuleEntity } from '../modules/repliz-sync/entities/repliz-sync-rule.entity';
import { ReplizSyncedPostEntity } from '../modules/repliz-sync/entities/repliz-synced-post.entity';
import { UrlImportHistoryEntity } from '../modules/repliz-sync/entities/url-import-history.entity';

config();

// __dirname resolve ke src/config saat dijalankan via ts-node (dev/migration
// CLI) dan ke dist/config saat dijalankan dari build hasil `nest build`
// (production) — jadi ekstensi file migration ikut benar otomatis (.ts vs .js)
// tanpa perlu 2 config terpisah.
const migrationExt = __filename.endsWith('.ts') ? 'ts' : 'js';

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
    AccountEntity,
    AccountDelegationEntity,
    ReplizSyncRuleEntity,
    ReplizSyncedPostEntity,
    UrlImportHistoryEntity,
  ],
  migrations: [join(__dirname, '..', 'migration', `*.${migrationExt}`)],
  synchronize: false,
  logging: true,
});
