import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { BullModule } from '@nestjs/bullmq';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { RolesModule } from './modules/roles/roles.module';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { MailModule } from './modules/mailer/mailer.module';
import { LogsModule } from './modules/logs/logs.module';
import { AccountsModule } from './modules/accounts/accounts.module';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    EventEmitterModule.forRoot(),
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        connection: {
          host: configService.get<string>('redis.host'),
          port: configService.get<number>('redis.port'),
          maxRetriesPerRequest: null,
        },
      }),
    }),
    LogsModule,
    AuthModule,
    UsersModule,
    MailModule,
    RolesModule,
    AccountsModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_INTERCEPTOR,
      useClass: LoggingInterceptor,
    },
  ],
})
export class AppModule {}
