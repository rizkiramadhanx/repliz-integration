import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import bcrypt from 'bcrypt';
import { plainToInstance } from 'class-transformer';
import ACTION_ROLES from 'src/constant/action-roles';
import { Repository } from 'typeorm';
import { generateFromEmail } from 'unique-username-generator';
import { MailService } from '../mailer/mailer.service';
import { RoleEntity } from '../roles/entities/role.entity';
import { LoginDto } from '../users/dto/base-user.dto';
import { RegisterUserDto } from '../users/dto/create-user.dto';
import { UserEntity } from '../users/entities/user.entity';
import { RegisterDto } from './dto/register.dto';

@Injectable()
export class AuthService {
  constructor(
    @Inject('ACCESS_TOKEN_SERVICE')
    private readonly accessTokenService: JwtService,
    @Inject('REFRESH_TOKEN_SERVICE')
    private readonly refreshTokenService: JwtService,
    @InjectRepository(UserEntity)
    private userRepository: Repository<UserEntity>,
    @InjectRepository(RoleEntity)
    private roleRepository: Repository<RoleEntity>,
    private configService: ConfigService,
    private mailService: MailService,
  ) {}

  generateJwt(payload) {
    return this.accessTokenService.sign(payload);
  }

  generateRefresh(payload) {
    return this.refreshTokenService.sign(payload);
  }

  async hashingPassword(password: string): Promise<string> {
    const saltRounds = 10;
    const salt = await bcrypt.genSalt(saltRounds);
    return await bcrypt.hash(password, salt);
  }

  async comparePassword(
    plainPassword: string,
    hashedPassword: string,
  ): Promise<boolean> {
    return bcrypt.compare(plainPassword, hashedPassword);
  }

  async sendVerificationEmail(user: UserEntity) {
    if (user.isConfirmed)
      throw new BadRequestException('Email already verified');
    const payload = { sub: user.id, email: user.email };
    const token = this.generateJwt(payload);
    const confirmationUrl = `${this.configService.get<string>('FRONT_END_URL')}/auth/confirm?code=${token}`;
    await this.mailService.sendVerificationEmail(
      user.email,
      user.name,
      confirmationUrl,
    );
  }

  async verifyEmail(token: string) {
    try {
      const payload = await this.accessTokenService.verifyAsync(token, {
        secret: this.configService.get('config.jwt.secret'),
      });

      const user = await this.userRepository.findOne({
        where: { email: payload.email },
      });
      if (!user) throw new UnauthorizedException('Invalid token');

      user.isConfirmed = true;
      await this.userRepository.update(user.id, { isConfirmed: true });

      return { message: 'Email verified successfully' };
    } catch (error) {
      throw new UnauthorizedException('Invalid or expired token');
    }
  }

  async registerManualUser(user: RegisterDto) {
    const userExists = await this.userRepository.findOne({
      where: { email: user.email },
    });
    if (userExists) throw new ConflictException('Email already in use');

    return await this.userRepository.manager.transaction(
      async (transactionalEntityManager) => {
        const newUser = this.userRepository.create({
          name: user.username,
          email: user.email,
          password: await this.hashingPassword(user.password),
        });

        const roleAdmin = this.roleRepository.create({
          name: 'Admin',
          actions: [].concat(...ACTION_ROLES.map((item) => item.actions)),
        });
        await transactionalEntityManager.save(roleAdmin);
        newUser.role = roleAdmin;

        await transactionalEntityManager.save(newUser);

        if (process.env.NODE_ENV !== 'development') {
          await this.sendVerificationEmail(newUser);
        }
        return newUser;
      },
    );
  }

  async login(userLogin: LoginDto): Promise<{
    access_token: string;
    refresh_token: string;
    user: UserEntity;
  }> {
    const userExists = await this.userRepository.findOne({
      where: { email: userLogin.email },
      relations: ['role'],
    });

    if (!userExists) {
      throw new NotFoundException('User not found');
    }
    if (!userExists.isConfirmed)
      throw new ForbiddenException('Please verify your email to continue');

    const isPasswordValid = await this.comparePassword(
      userLogin.password,
      userExists.password,
    );
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const tokens = this.generateTokens(userExists);
    const userProfile = await this.getUserProfile(userExists.id);

    console.log(userProfile);

    return {
      ...tokens,
      user: userProfile,
    };
  }

  async signIn(user) {
    if (!user) {
      throw new BadRequestException('Unauthenticated');
    }
    const userExists = await this.userRepository.findOne({
      where: { email: user.email },
    });

    if (userExists?.password) {
      throw new UnauthorizedException('please login using password');
    }

    if (!userExists) {
      return this.registerUser(user);
    }

    return this.generateTokens(userExists);
  }

  async registerUser(user: RegisterUserDto) {
    try {
      const newUser = this.userRepository.create(user);
      newUser.name = generateFromEmail(user.email, 5);
      newUser.isConfirmed = true;
      await this.userRepository.save(newUser);

      return this.generateTokens(newUser);
    } catch (error) {
      console.error('Error in registerUser:', error);
      throw new InternalServerErrorException(
        'Failed to register user: ' + error.message,
      );
    }
  }

  private generateTokens(user: UserEntity) {
    const payload = { sub: user.id, email: user.email };

    const access_token = this.generateJwt(payload);
    const refresh_token = this.generateRefresh(payload);

    return {
      access_token,
      refresh_token,
    };
  }

  async refreshTokens(refreshToken: string) {
    try {
      const payload = await this.refreshTokenService.verifyAsync(refreshToken, {
        secret: this.configService.get('config.refresh.secret'),
      });
      const user = await this.userRepository.findOne({
        where: { id: payload.sub },
      });
      if (!user) {
        throw new UnauthorizedException('User not found');
      }
      return this.generateTokens(user);
    } catch (error) {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  async getUserProfile(id: string) {
    const user = await this.userRepository.findOne({
      where: { id },
      relations: ['role'],
    });

    const userSerialized = plainToInstance(UserEntity, user);

    return userSerialized;
  }
}
