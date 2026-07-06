import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export type CurrentUserType = {
  id: string;
  email?: string;
  role?: { id: string; name: string; actions: string[] } | null;
};

export const CurrentUser = createParamDecorator<
  unknown,
  ExecutionContext,
  CurrentUserType
>((_: unknown, ctx: ExecutionContext) => {
  const req = ctx.switchToHttp().getRequest();
  return req.user as CurrentUserType;
});
