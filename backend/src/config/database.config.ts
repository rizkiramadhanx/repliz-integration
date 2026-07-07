import { registerAs } from '@nestjs/config';
import { TypeOrmModuleOptions } from '@nestjs/typeorm';

export default registerAs(
  'database',
  (): TypeOrmModuleOptions => ({
    type: 'postgres',
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT, 10) || 5432,
    username: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    entities: [__dirname + '/../../modules/**/entities/*.entity.{js,ts}'],
    synchronize: false,
    autoLoadEntities: true,
    // SSL untuk koneksi DB dipisah dari NODE_ENV secara sengaja — Postgres
    // self-hosted (container polos di docker-compose.yml) tidak setup SSL,
    // beda dari DB cloud terkelola (RDS/Supabase/dst) yang biasanya wajib
    // SSL. Default off; set DB_SSL=true kalau pindah ke DB yang butuh SSL.
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
  }),
);
