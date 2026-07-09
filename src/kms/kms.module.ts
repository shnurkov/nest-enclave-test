import { Module } from '@nestjs/common';
import { KmsController } from './kms.controller';
import { KmsService } from './kms.service';

@Module({
  controllers: [KmsController],
  providers: [KmsService],
})
export class KmsModule {}
