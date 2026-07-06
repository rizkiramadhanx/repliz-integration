import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpException,
  HttpStatus,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { Request, Response } from 'express';
import {
  createSuccessResponse,
  createErrorResponse,
} from '../../common/type/response';
import { LoginDto } from '../users/dto/base-user.dto';
import { UserEntity } from '../users/entities/user.entity';
import { AuthService } from './auth.service';
import { ConfirmEmailDto } from './dto/confirm-email.dto';
import { RegisterDto } from './dto/register.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RefreshTokenGuard } from './guards/refresh-auth.guard';
import { LogsService } from '../logs/logs.service';

@Controller('auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    private logsService: LogsService,
  ) {}

  @Post('refresh')
  @UseGuards(RefreshTokenGuard)
  async refreshTokens(@Body('refresh_token') refreshToken: string) {
    try {
      const { access_token } =
        await this.authService.refreshTokens(refreshToken);
      return createSuccessResponse('Token refreshed', { access_token });
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException('Invalid refresh token', HttpStatus.UNAUTHORIZED);
    }
  }
  @Post('register')
  async register(@Body() registeruser: RegisterDto) {
    try {
      await this.authService.registerManualUser(registeruser);
      return createSuccessResponse('register user succes');
    } catch (error) {
      console.log(error);
      if (error instanceof HttpException) {
        const status = error.getStatus();
        return createErrorResponse(error.message, status);
      }
      return createErrorResponse(error.response?.message, 401);
    }
  }

  @Post('verify')
  async verifEmail(@Body() confirmEmailDto: ConfirmEmailDto) {
    try {
      await this.authService.verifyEmail(confirmEmailDto.token);
      return createSuccessResponse('succes verified email');
    } catch (error) {
      if (error instanceof HttpException) {
        const status = error.getStatus();
        return createErrorResponse(error.message, status);
      }
      return createErrorResponse(error.response?.message, 401);
    }
  }

  @Post('resend/verify')
  @UseGuards(JwtAuthGuard)
  async resendVerifEmail(@Req() req: Request) {
    const user = req.user as UserEntity;
    try {
      await this.authService.sendVerificationEmail(user);
    } catch (error) {
      throw new BadRequestException(
        error.message || 'Gagal mengirim email verifikasi',
      );
    }
  }

  @Post('login')
  async login(@Body() userLogin: LoginDto) {
    try {
      const { access_token, refresh_token, user } =
        await this.authService.login(userLogin);
      await this.logsService.createLog({
        action: 'auth:login',
        userId: user?.id,
        status: 'SUCCESS',
        statusCode: HttpStatus.OK,
      });
      const data = { access_token, refresh_token, user };
      return createSuccessResponse('Login Success', data);
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      const message =
        error instanceof Error ? error.message : 'Internal Server Error';
      throw new HttpException(message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  async logout() {
    return createSuccessResponse('Logged out successfully');
  }

  @UseGuards(JwtAuthGuard)
  @Get('profile')
  async getProfile(@Req() req: Request, @Res() res: Response) {
    const { id } = req.user as { id: string };

    try {
      const userData = await this.authService.getUserProfile(id);
      return res
        .status(HttpStatus.OK)
        .json(createSuccessResponse('Get profile success', userData));
    } catch (err) {
      return res
        .status(HttpStatus.INTERNAL_SERVER_ERROR)
        .json(createErrorResponse('Failed to get profile', err.message));
    }
  }
}
