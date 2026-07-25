import { createParamDecorator, ExecutionContext } from '@nestjs/common';

import { JwtPayload } from '../types/jwt-payload.type';

// Reads req.user, set by AtStrategy on protected routes. Pass a key to pluck a single field:
// @GetCurrentUser('sub') userId: string.
export const GetCurrentUser = createParamDecorator(
  (data: keyof JwtPayload | undefined, context: ExecutionContext) => {
    const request = context.switchToHttp().getRequest<{ user: JwtPayload }>();
    if (!data) return request.user;
    return request.user?.[data];
  },
);
