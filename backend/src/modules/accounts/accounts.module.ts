import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AccountEntity } from './entities/account.entity';
import { AccountDelegationEntity } from './entities/account-delegation.entity';
import { AccountsService } from './accounts.service';
import { AccountsController } from './accounts.controller';
import { AccountsCron } from './accounts.cron';
import { LogsModule } from '../logs/logs.module';
import { TelegramPublisher } from './publishers/telegram.publisher';
import { FacebookPublisher } from './publishers/facebook.publisher';
import { FacebookGroupsScraper } from './publishers/facebook-groups.scraper';
import { InstagramPublisher } from './publishers/instagram.publisher';
import { TwitterPublisher } from './publishers/twitter.publisher';
import { ConnectionCheckService } from './connection-check/connection-check.service';
import { DiscordChecker } from './connection-check/discord.checker';
import { CookieSessionChecker } from './connection-check/cookie-session.checker';

@Module({
  imports: [
    TypeOrmModule.forFeature([AccountEntity, AccountDelegationEntity]),
    LogsModule,
  ],
  controllers: [AccountsController],
  providers: [
    AccountsService,
    AccountsCron,
    TelegramPublisher,
    FacebookPublisher,
    FacebookGroupsScraper,
    InstagramPublisher,
    TwitterPublisher,
    ConnectionCheckService,
    DiscordChecker,
    CookieSessionChecker,
  ],
  exports: [
    AccountsService,
    TelegramPublisher,
    FacebookPublisher,
    InstagramPublisher,
    TwitterPublisher,
  ],
})
export class AccountsModule {}
