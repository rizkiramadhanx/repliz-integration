import { Injectable } from '@nestjs/common';
import { MailerService } from '@nestjs-modules/mailer';

@Injectable()
export class MailService {
  constructor(private readonly mailService: MailerService) {}
  async sendVerificationEmail(
    to: string,
    username: string,
    confirmationLink: string,
  ): Promise<boolean> {
    try {
      await this.mailService.sendMail({
        to,
        subject: 'Email Verification',
        template: './email-verification',
        context: {
          username,
          confirmationLink,
        },
      });
      console.log(`Verification email sent successfully to ${to}`);
      return true;
    } catch (error) {
      console.error(`Error sending verification email to ${to}:`, error);
      throw new Error(`Failed to send verification email to ${to}`);
    }
  }

  // Alert status koneksi akun. Sengaja mengembalikan boolean (bukan throw)
  // supaya kegagalan kirim email tidak menggagalkan cron pengecekan koneksi
  // atau request yang memicunya — alert bersifat pelengkap, bukan inti.
  async sendAccountAlert(
    to: string,
    subject: string,
    title: string,
    lines: string[],
  ): Promise<boolean> {
    try {
      await this.mailService.sendMail({
        to,
        subject,
        template: './account-alert',
        context: {
          title,
          lines,
          checkedAt: new Date().toLocaleString('id-ID'),
        },
      });
      return true;
    } catch (error) {
      console.error(`Error sending account alert email to ${to}:`, error);
      return false;
    }
  }
}
