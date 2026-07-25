import { ForbiddenException, Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Request } from 'express';
import { Strategy } from 'passport-custom';

import { AuthService, RefreshSession } from '../auth.service';

// The refresh token is opaque (40 random bytes), not a JWT, so this is a passport-custom
// strategy rather than passport-jwt: validation is a database lookup, not a signature check.
@Injectable()
export class RtStrategy extends PassportStrategy(Strategy, 'jwt-refresh') {
  constructor(private readonly authService: AuthService) {
    super();
  }

  async validate(req: Request): Promise<RefreshSession> {
    const rawToken: string | undefined = req.cookies?.['refresh_token'];
    if (!rawToken) {
      throw new ForbiddenException('Refresh token missing.');
    }
    return this.authService.validateRefreshToken(rawToken);
  }
}
