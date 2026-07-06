import { ClassSerializerInterceptor, ValidationPipe } from '@nestjs/common';
import { NestFactory, Reflector } from '@nestjs/core';
import cookieParser from 'cookie-parser';
import { config } from 'dotenv';
import { join } from 'path';
import { AppModule } from './app.module';
import express from 'express';

config();
// Semua waktu aplikasi pakai UTC (response ISO string, expired_at +12 jam, dll.)
process.env.TZ = 'UTC';

async function bootstrap() {
  console.log('NODE_ENV:', process.env.NODE_ENV);
  const app = await NestFactory.create(AppModule);

  // Serve uploaded files (e.g. event image_background, brochure)
  app.use('/uploads', express.static(join(process.cwd(), 'uploads')));

  app.useGlobalInterceptors(new ClassSerializerInterceptor(app.get(Reflector)));

  app.enableCors({
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile apps, Postman, etc.)
      if (!origin) return callback(null, true);

      // List of allowed origins
      const allowedOrigins = [
        'http://localhost:3000',
        'http://localhost:5173',
        'http://127.0.0.1:3000',
        'http://127.0.0.1:5173',
        'http://localhost:4321',
      ];

      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      // Untuk development, Anda bisa uncomment baris di bawah ini untuk allow semua origin
      // return callback(null, true);

      return callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'Accept',
      'Origin',
      'X-Requested-With',
      'Access-Control-Request-Method',
      'Access-Control-Request-Headers',
    ],
    exposedHeaders: ['Authorization'],
    optionsSuccessStatus: 200, // Untuk legacy browser support
  });
  app.useGlobalPipes(new ValidationPipe());
  app.setGlobalPrefix('api');
  app.use(cookieParser());

  await app.listen(process.env.PORT, () => {
    console.log(`Server is running at http://localhot:${process.env.PORT}`);
  });
}
bootstrap();
