import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

export const REDIS_CLIENT = 'REDIS_CLIENT';

export const redisClientProvider = {
  provide: REDIS_CLIENT,
  inject: [ConfigService],
  useFactory: (configService: ConfigService) =>
    new Redis({
      host: configService.get<string>('redis.host'),
      port: configService.get<number>('redis.port'),
      maxRetriesPerRequest: null,
    }),
};
