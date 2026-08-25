import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AccountEntity } from '../accounts/entities/account.entity';
import { ReplizModule } from '../repliz/repliz.module';
import { ReplizSyncRuleEntity } from './entities/repliz-sync-rule.entity';
import { ReplizSyncedPostEntity } from './entities/repliz-synced-post.entity';
import { UrlImportHistoryEntity } from './entities/url-import-history.entity';
import { UrlImportJobEntity } from './entities/url-import-job.entity';
import { ReplizSyncController } from './repliz-sync.controller';
import { ReplizSyncService } from './repliz-sync.service';
import { UrlImportService } from './url-import.service';
import { MediaCleanupService } from './media-cleanup.service';
import { ReplizSyncCron } from './repliz-sync.cron';

@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([
      ReplizSyncRuleEntity,
      ReplizSyncedPostEntity,
      UrlImportHistoryEntity,
      UrlImportJobEntity,
      AccountEntity,
    ]),
    ReplizModule,
  ],
  controllers: [ReplizSyncController],
  providers: [
    
    ReplizSyncService,
    UrlImportService,
    MediaCleanupService,
    ReplizSyncCron,
  ],
  exports: [ReplizSyncService],
})
export class ReplizSyncModule {}
