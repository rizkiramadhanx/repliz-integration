import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PostHistoryEntity } from './entities/post-history.entity';
import { AccountEntity } from '../accounts/entities/account.entity';
import { PostHistoryService } from './post-history.service';
import { PostHistoryController } from './post-history.controller';

@Module({
  imports: [TypeOrmModule.forFeature([PostHistoryEntity, AccountEntity])],
  controllers: [PostHistoryController],
  providers: [PostHistoryService],
  exports: [PostHistoryService],
})
export class PostHistoryModule {}
