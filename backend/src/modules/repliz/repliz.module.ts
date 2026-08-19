import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ReplizService } from './repliz.service';
import { ReplizController } from './repliz.controller';

@Module({
  imports: [ConfigModule],
  controllers: [ReplizController],
  providers: [ReplizService],
  exports: [ReplizService],
})
export class ReplizModule {}
