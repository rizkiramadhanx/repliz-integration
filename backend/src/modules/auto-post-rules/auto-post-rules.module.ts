import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AutoPostRuleEntity } from './entities/auto-post-rule.entity';
import { AccountEntity } from '../accounts/entities/account.entity';
import { AutoPostRulesService } from './auto-post-rules.service';
import { AutoPostRulesController } from './auto-post-rules.controller';
import { DiscordObserverManager } from './worker/discord-observer.manager';
import { PublishTargetsService } from './worker/publish-targets';
import { AccountsModule } from '../accounts/accounts.module';
import { LogsModule } from '../logs/logs.module';
import { PostHistoryModule } from '../post-history/post-history.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([AutoPostRuleEntity, AccountEntity]),
    AccountsModule,
    LogsModule,
    PostHistoryModule,
  ],
  controllers: [AutoPostRulesController],
  providers: [
    AutoPostRulesService,
    DiscordObserverManager,
    PublishTargetsService,
  ],
  exports: [AutoPostRulesService],
})
export class AutoPostRulesModule {}
