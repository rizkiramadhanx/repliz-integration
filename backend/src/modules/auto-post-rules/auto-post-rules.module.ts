import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bullmq';
import { AutoPostRuleEntity } from './entities/auto-post-rule.entity';
import { ProcessedInstagramPostEntity } from './entities/processed-instagram-post.entity';
import { AccountEntity } from '../accounts/entities/account.entity';
import { AutoPostRulesService } from './auto-post-rules.service';
import { AutoPostRulesController } from './auto-post-rules.controller';
import { DiscordObserverManager } from './worker/discord-observer.manager';
import { InstagramObserverManager } from './worker/instagram-observer.manager';
import { PublishTargetsService } from './worker/publish-targets';
import { PublishQueueProcessor } from './worker/publish-queue.processor';
import { PUBLISH_QUEUE_NAME } from './worker/publish-queue.constants';
import { AccountsModule } from '../accounts/accounts.module';
import { LogsModule } from '../logs/logs.module';
import { PostHistoryModule } from '../post-history/post-history.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      AutoPostRuleEntity,
      AccountEntity,
      ProcessedInstagramPostEntity,
    ]),
    BullModule.registerQueue({ name: PUBLISH_QUEUE_NAME }),
    AccountsModule,
    LogsModule,
    PostHistoryModule,
  ],
  controllers: [AutoPostRulesController],
  providers: [
    AutoPostRulesService,
    DiscordObserverManager,
    InstagramObserverManager,
    PublishTargetsService,
    PublishQueueProcessor,
  ],
  exports: [AutoPostRulesService],
})
export class AutoPostRulesModule {}
