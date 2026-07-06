import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { MODULE_ACCESS_KEY } from '../decorators/module-access.decorator';

@Injectable()
export class ModuleAccessGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredModule = this.reflector.getAllAndOverride<string>(
      MODULE_ACCESS_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredModule) return true;

    const request = context.switchToHttp().getRequest();
    const user = request.user as any;

    // Asumsi: user.role ADMIN (0) bebas, atau user.modules termasuk nama modul
    // Jika struktur modules berbeda, sesuaikan di sini.
    const isAdmin = user?.role === 0 || user?.role === 'ADMIN';
    const modules: string[] = Array.isArray(user?.modules) ? user.modules : [];

    const hasAccess = isAdmin || modules.includes(requiredModule);
    if (!hasAccess) {
      throw new ForbiddenException('Insufficient module access');
    }
    return true;
  }
}
