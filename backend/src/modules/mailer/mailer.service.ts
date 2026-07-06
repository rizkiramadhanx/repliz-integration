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
}
