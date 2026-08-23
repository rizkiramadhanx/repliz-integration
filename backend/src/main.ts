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

  // Media dari extension dikirim sebagai base64 di dalam JSON, dan base64
  // membengkakkan ukuran ~33%. Batas bawaan Express (100kb) akan menolak
  // bahkan satu foto, jadi dinaikkan seukuran video pendek + margin.
  app.use(express.json({ limit: '150mb' }));
  app.use(express.urlencoded({ limit: '150mb', extended: true }));

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

      // Domain frontend production dari env (FRONT_END_URL) — otomatis
      // sertakan varian dengan/tanpa "www." supaya kedua bentuk domain
      // yang dilayani Traefik (lihat docker-compose.yml) tidak kena CORS.
      if (process.env.FRONT_END_URL) {
        try {
          const url = new URL(process.env.FRONT_END_URL);
          allowedOrigins.push(url.origin);
          if (url.hostname.startsWith('www.')) {
            allowedOrigins.push(
              `${url.protocol}//${url.hostname.replace(/^www\./, '')}`,
            );
          } else {
            allowedOrigins.push(`${url.protocol}//www.${url.hostname}`);
          }
        } catch {
          // FRONT_END_URL tidak valid sebagai URL — abaikan, jangan crash bootstrap
        }
      }

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
