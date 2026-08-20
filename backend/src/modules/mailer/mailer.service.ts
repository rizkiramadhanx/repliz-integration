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

  // Subject dan alamat email adalah header SMTP: CR/LF di dalamnya memecah
  // header dan memungkinkan penyisipan header baru (mis. `Bcc:` ke alamat
  // penyerang). Isi alert memuat data yang diketik pengguna — nama akun dan
  // pesan error dari platform — jadi harus dibersihkan sebelum dipakai.
  // Panjang juga dibatasi karena subject sangat panjang bisa ditolak server.
  private sanitizeHeader(value: string, maxLength = 200): string {
    return value
      .replace(/[\r\n]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, maxLength);
  }

  // Validasi longgar: cukup memastikan bentuknya alamat tunggal tanpa
  // karakter pemisah header. Tujuannya mencegah nilai env yang salah tulis
  // (mis. dua alamat dipisah koma, atau berisi newline) menjadi header rusak.
  private isValidEmail(value: string): boolean {
    return /^[^\s@,;:<>"\r\n]+@[^\s@,;:<>"\r\n]+\.[^\s@,;:<>"\r\n]+$/.test(
      value,
    );
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
    const recipient = (to ?? '').trim();
    if (!this.isValidEmail(recipient)) {
      // Tidak melempar: alert bersifat pelengkap, dan alamat tujuan berasal
      // dari env yang bisa saja belum diisi dengan benar.
      console.error(
        `Alamat tujuan alert tidak valid, pengiriman dilewati: ${JSON.stringify(recipient)}`,
      );
      return false;
    }

    try {
      await this.mailService.sendMail({
        to: recipient,
        subject: this.sanitizeHeader(subject),
        template: './account-alert',
        context: {
          // title & lines masuk ke BODY, bukan header, jadi CR/LF di sana
          // tidak berbahaya. Handlebars sudah meng-escape HTML lewat `{{ }}`
          // (bukan `{{{ }}}`), sehingga label akun tidak bisa menyuntikkan
          // markup. Panjangnya tetap dibatasi agar email tidak membengkak.
          title: this.sanitizeHeader(title, 300),
          lines: (lines ?? []).slice(0, 200).map((line) => line.slice(0, 500)),
          checkedAt: new Date().toLocaleString('id-ID'),
        },
      });
      return true;
    } catch (error) {
      // Sengaja hanya mencatat pesan error, bukan objek error utuh: objek
      // dari nodemailer bisa memuat konfigurasi transport termasuk kredensial
      // SMTP, yang tidak boleh masuk ke log.
      const message = error instanceof Error ? error.message : String(error);
      console.error(`Gagal mengirim alert ke ${recipient}: ${message}`);
      return false;
    }
  }
}
