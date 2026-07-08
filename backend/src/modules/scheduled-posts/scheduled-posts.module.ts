import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bullmq';
import { ScheduledPostEntity } from './entities/scheduled-post.entity';
import { ScrapeBatchJobEntity } from './entities/scrape-batch-job.entity';
import { ScrapedPostEntity } from './entities/scraped-post.entity';
import { BlastJobEntity } from './entities/blast-job.entity';
import { BlastGroupResultEntity } from './entities/blast-group-result.entity';
import { AccountEntity } from '../accounts/entities/account.entity';
import { ScheduledPostsService } from './scheduled-posts.service';
import { ScheduledPostsController } from './scheduled-posts.controller';
import { ScrapeBatchesService } from './scrape-batches.service';
import { ScrapeBatchesController } from './scrape-batches.controller';
import { BlastService } from './blast.service';
import { BlastController } from './blast.controller';
import { ScheduledPostProcessor } from './worker/scheduled-post.processor';
import { ScrapeBatchProcessor } from './worker/scrape-batch.processor';
import { BlastProcessor } from './worker/blast.processor';
import { ScrapeProgressGateway } from './scrape-progress.gateway';
import { BlastProgressGateway } from './blast-progress.gateway';
import { SCHEDULED_POST_QUEUE_NAME } from './worker/scheduled-post-queue.constants';
import { SCRAPE_BATCH_QUEUE_NAME } from './worker/scrape-batch-queue.constants';
import { BLAST_QUEUE_NAME } from './worker/blast-queue.constants';
import { AccountsModule } from '../accounts/accounts.module';
import { LogsModule } from '../logs/logs.module';
import { PostHistoryModule } from '../post-history/post-history.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ScheduledPostEntity,
      ScrapeBatchJobEntity,
      ScrapedPostEntity,
      BlastJobEntity,
      BlastGroupResultEntity,
      AccountEntity,
    ]),
    BullModule.registerQueue(
      { name: SCHEDULED_POST_QUEUE_NAME },
      { name: SCRAPE_BATCH_QUEUE_NAME },
      { name: BLAST_QUEUE_NAME },
    ),
    AccountsModule,
    LogsModule,
    PostHistoryModule,
  ],
  controllers: [
    ScheduledPostsController,
    ScrapeBatchesController,
    BlastController,
  ],
  providers: [
    ScheduledPostsService,
    ScrapeBatchesService,
    BlastService,
    ScheduledPostProcessor,
    ScrapeBatchProcessor,
    BlastProcessor,
    ScrapeProgressGateway,
    BlastProgressGateway,
  ],
  exports: [ScheduledPostsService],
})
export class ScheduledPostsModule {}
