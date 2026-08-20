import { Module } from '@nestjs/common';
import { MailerModule } from '@nestjs-modules/mailer';
import { HandlebarsAdapter } from '@nestjs-modules/mailer/dist/adapters/handlebars.adapter';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MailService } from './mailer.service';
import path from 'path';

@Module({
  imports: [
    ConfigModule, // Ensure ConfigModule is imported to access env variables
    MailerModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        transport: {
          host: configService.get<string>('MAIL_HOST'),
          port: Number(configService.get<string>('MAIL_PORT')) || 465,
          // SMTP implisit-TLS (465) butuh secure: true, sedangkan STARTTLS
          // (587/25) butuh false. Sebelumnya nilainya dipaku true sehingga
          // koneksi ke port 587 akan menggantung. Default mengikuti port
          // supaya konfigurasi umum tetap benar tanpa MAIL_SECURE.
          secure:
            configService.get<string>('MAIL_SECURE') !== undefined
              ? configService.get<string>('MAIL_SECURE') === 'true'
              : Number(configService.get<string>('MAIL_PORT')) === 465,
          auth: {
            user: configService.get<string>('MAIL_USER'),
            pass: configService.get<string>('MAIL_PASS'),
          },
        },
        defaults: {
          // Nama pengirim sebelumnya dipaku "No Reply"; kini bisa diatur
          // lewat MAIL_FROM_NAME. Tanda kutip di dalam nama di-escape agar
          // header From tidak rusak.
          from: `"${(
            configService.get<string>('MAIL_FROM_NAME') ?? 'No Reply'
          ).replace(/"/g, '\\"')}" <${configService.get<string>('MAIL_FROM')}>`,
        },
        template: {
          dir: path.join(
            process.cwd(),
            'src',
            'modules',
            'mailer',
            'templates',
          ),
          adapter: new HandlebarsAdapter(),
          options: {
            strict: true,
          },
        },
      }),
      inject: [ConfigService],
    }),
  ],
  providers: [MailService],
  exports: [MailService],
})
export class MailModule {}
