import { registerAs } from '@nestjs/config';

export default registerAs('config', () => ({
  jwt: {
    secret: process.env.JWT_SECRET,
    expiresIn: process.env.JWT_EXPIRES_IN || '3600s',
  },
  refresh: {
    secret: process.env.JWT_SECRET_REFRESH,
    expiresIn: process.env.JWT_EXPIRES_IN_REFRESH,
  },
}));
