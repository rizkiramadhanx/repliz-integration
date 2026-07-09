import { registerAs } from '@nestjs/config';

export default registerAs('whatsapp', () => ({
  baseUrl: process.env.WA_BASE_URL,
  basicAuthUser: process.env.WA_BASIC_AUTH_USER,
  basicAuthPass: process.env.WA_BASIC_AUTH_PASS,
  deviceId: process.env.WA_DEVICE_ID,
  alertTargetPhone: process.env.WA_ALERT_TARGET_PHONE,
}));
