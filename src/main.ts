import 'dotenv/config';
import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  logger.log(
    `Env: PORT=${process.env.PORT ?? '(default 4545)'} ` +
      `AWS_REGION=${process.env.AWS_REGION ?? '(unset)'} ` +
      `AWS_KMS_ENDPOINT=${process.env.AWS_KMS_ENDPOINT ?? '(unset)'}`,
  );

  const app = await NestFactory.create(AppModule);
  await app.listen(process.env.PORT ?? 4545);
}
bootstrap();
