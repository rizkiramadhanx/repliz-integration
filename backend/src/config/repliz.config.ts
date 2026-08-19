import { registerAs } from '@nestjs/config';

export default registerAs('repliz', () => ({
  baseUrl: process.env.REPLIZ_BASE_URL || 'https://api.repliz.com',
  accessKey: process.env.REPLIZ_ACCESS_KEY,
  secretKey: process.env.REPLIZ_SECRET_KEY,
}));
