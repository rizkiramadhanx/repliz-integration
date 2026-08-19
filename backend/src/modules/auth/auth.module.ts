import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { RefreshTokenStrategy } from './strategies/refresh.strategy';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserEntity } from '../users/entities/user.entity';
import { RoleEntity } from '../roles/entities/role.entity';
import { ConfigModule, ConfigService } from '@nestjs/config';
import config from './../../config/jwt.config';
import { DatabaseModule } from './../../database/database.module';
import databaseConfig from './../../config/database.config';
import redisConfig from './../../config/redis.config';
import { MailService } from '../mailer/mailer.service';
import { MailModule } from '../mailer/mailer.module';
import { LogsModule } from '../logs/logs.module';

@Module({
  imports: [
    DatabaseModule,
    LogsModule,
    PassportModule,
    MailModule,
    TypeOrmModule.forFeature([UserEntity, RoleEntity]),
    ConfigModule.forRoot({
      isGlobal: true,
      load: [databaseConfig, redisConfig],
    }),
    ConfigModule.forFeature(config),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get('config.jwt.secret'),
        signOptions: {
          expiresIn: configService.get('config.jwt.expiresIn') || '3600s',
        },
      }),
      inject: [ConfigService],
    }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get('config.refresh.secret'),
        signOptions: {
          expiresIn: configService.get('config.refresh.expiresIn'),
        },
      }),
      inject: [ConfigService],
      global: true,
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    JwtStrategy,
    RefreshTokenStrategy,
    // moved security guards here
    MailService,
    {
      provide: 'ACCESS_TOKEN_SERVICE',
      useExisting: JwtService,
    },
    {
      provide: 'REFRESH_TOKEN_SERVICE',
      useFactory: async (configService: ConfigService) => {
        const jwtService = new JwtService({
          secret: configService.get('config.refresh.secret'),
          signOptions: {
            expiresIn: configService.get('config.refresh.expiresIn'),
          },
        });
        return jwtService;
      },
      inject: [ConfigService],
    },
  ],
  exports: [AuthService, DatabaseModule], // Export AuthService jika diperlukan di modul lain
})
export class AuthModule {}
