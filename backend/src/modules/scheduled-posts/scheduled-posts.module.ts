import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bullmq';
import { ScheduledPostEntity } from './entities/scheduled-post.entity';
import { ScrapeBatchJobEntity } from './entities/scrape-batch-job.entity';
import { ScrapedPostEntity } from './entities/scraped-post.entity';
import { AccountEntity } from '../accounts/entities/account.entity';
import { ScheduledPostsService } from './scheduled-posts.service';
import { ScheduledPostsController } from './scheduled-posts.controller';
import { ScrapeBatchesService } from './scrape-batches.service';
import { ScrapeBatchesController } from './scrape-batches.controller';
import { ScheduledPostProcessor } from './worker/scheduled-post.processor';
import { ScrapeBatchProcessor } from './worker/scrape-batch.processor';
import { ScrapeProgressGateway } from './scrape-progress.gateway';
import { SCHEDULED_POST_QUEUE_NAME } from './worker/scheduled-post-queue.constants';
import { SCRAPE_BATCH_QUEUE_NAME } from './worker/scrape-batch-queue.constants';
import { AccountsModule } from '../accounts/accounts.module';
import { LogsModule } from '../logs/logs.module';
import { PostHistoryModule } from '../post-history/post-history.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ScheduledPostEntity,
      ScrapeBatchJobEntity,
      ScrapedPostEntity,
      AccountEntity,
    ]),
    BullModule.registerQueue(
      { name: SCHEDULED_POST_QUEUE_NAME },
      { name: SCRAPE_BATCH_QUEUE_NAME },
    ),
    AccountsModule,
    LogsModule,
    PostHistoryModule,
  ],
  controllers: [ScheduledPostsController, ScrapeBatchesController],
  providers: [
    ScheduledPostsService,
    ScrapeBatchesService,
    ScheduledPostProcessor,
    ScrapeBatchProcessor,
    ScrapeProgressGateway,
  ],
  exports: [ScheduledPostsService],
})
export class ScheduledPostsModule {}
