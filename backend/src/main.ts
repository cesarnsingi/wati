import { NestFactory }          from '@nestjs/core';
import { ValidationPipe }       from '@nestjs/common';
import { AppModule }            from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Global prefix
  app.setGlobalPrefix('api/v1');

  // CORS — allow your frontend domains
  app.enableCors({
    origin: process.env.FRONTEND_URL?.split(',') ?? ['http://localhost:3000'],
    credentials: true,
  });

  // Global validation pipe
  app.useGlobalPipes(new ValidationPipe({
    whitelist:        true,
    forbidNonWhitelisted: true,
    transform:        true,
  }));

  await app.listen(process.env.PORT ?? 4000);
  console.log(`🚀 Server running on port ${process.env.PORT ?? 4000}`);
}
bootstrap();
