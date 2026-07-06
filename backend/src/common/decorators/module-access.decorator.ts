import { SetMetadata } from '@nestjs/common';

export const MODULE_ACCESS_KEY = 'module_access';
export const RequireModuleAccess = (moduleName: string) =>
  SetMetadata(MODULE_ACCESS_KEY, moduleName);
