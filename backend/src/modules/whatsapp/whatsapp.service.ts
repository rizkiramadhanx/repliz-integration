import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  const withCountryCode = digits.startsWith('0')
    ? `62${digits.slice(1)}`
    : digits;
  return `${withCountryCode}@s.whatsapp.net`;
}

// Klien HTTP ke gateway go-whatsapp-web-multidevice
// (https://github.com/aldinokemal/go-whatsapp-web-multidevice) — instance
// yang sama dipakai oleh agen-cerdas-service. Login/QR/session WA sepenuhnya
// dikelola di gateway itu, service ini cuma nembak endpoint kirim pesan.
@Injectable()
export class WhatsappService {
  private readonly logger = new Logger(WhatsappService.name);

  constructor(private readonly configService: ConfigService) {}

  private buildHeaders(): Record<string, string> {
    const headers: Record<string, string> = {};
    const user = this.configService.get<string>('whatsapp.basicAuthUser');
    const pass = this.configService.get<string>('whatsapp.basicAuthPass');
    if (user && pass) {
      headers.Authorization = `Basic ${Buffer.from(`${user}:${pass}`).toString('base64')}`;
    }
    const deviceId = this.configService.get<string>('whatsapp.deviceId');
    if (deviceId) {
      headers['X-Device-Id'] = deviceId;
    }
    return headers;
  }

  async sendMessage(phone: string, message: string): Promise<boolean> {
    const baseUrl = this.configService.get<string>('whatsapp.baseUrl');
    if (!baseUrl) {
      this.logger.warn('WA_BASE_URL belum dikonfigurasi, pesan WA di-skip');
      return false;
    }

    if (process.env.NODE_ENV !== 'production') {
      this.logger.log(`[dev] Skip kirim WA ke ${phone}: ${message}`);
      return false;
    }

    try {
      await axios.post(
        `${baseUrl}/send/message`,
        { phone: normalizePhone(phone), message },
        { headers: this.buildHeaders(), timeout: 15000 },
      );
      this.logger.log(`Pesan WA terkirim ke ${phone}`);
      return true;
    } catch (err) {
      const detail = err instanceof Error ? err.message : String(err);
      this.logger.error(`Gagal kirim pesan WA ke ${phone}: ${detail}`);
      return false;
    }
  }
}
