import { Module } from '@nestjs/common';
import { KmsModule } from './kms/kms.module';

@Module({
  imports: [KmsModule],
})
export class AppModule {}
