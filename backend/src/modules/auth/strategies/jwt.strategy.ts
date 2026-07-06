import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import {
  Inject,
  Injectable,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { ConfigType } from '@nestjs/config';
import config from '../../../config/jwt.config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserEntity } from '../../users/entities/user.entity';
// Relations are loaded via string names in findOne options

export type JwtPayload = {
  sub: string;
  email: string;
  role?: string;
};

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    @Inject(config.KEY) private configService: ConfigType<typeof config>,
    @InjectRepository(UserEntity)
    private userRepository: Repository<UserEntity>,
  ) {
    const extractJwtFromHeader = (req: any) => {
      const token = ExtractJwt.fromAuthHeaderAsBearerToken()(req);

      return token;
    };

    super({
      ignoreExpiration: false,
      secretOrKey: configService.jwt.secret,
      jwtFromRequest: extractJwtFromHeader,
    });
  }

  async validate(payload: JwtPayload) {
    try {
      const user = await this.userRepository.findOne({
        where: { email: payload.email },
        select: {
          id: true,
          email: true,
          isConfirmed: true,
          role: {
            id: true,
            name: true,
            actions: true,
          },
        },
        relations: ['role'],
      });

      if (!user) {
        throw new UnauthorizedException('Please log in to continue');
      }

      if (!user.isConfirmed) {
        throw new ForbiddenException('Please verify your email to continue');
      }

      const result = {
        id: payload.sub,
        email: payload.email,
        role: user.role,
      };

      return result as any;
    } catch (error) {
      throw error;
    }
  }
}
