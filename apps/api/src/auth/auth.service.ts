import { createHash, randomBytes } from 'node:crypto';

import { ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Session, User } from '@prisma/client';
import * as bcrypt from 'bcrypt';

import { JwtPayload } from '../common/types/jwt-payload.type';
import { PrismaService } from '../prisma/prisma.service';
import { UsersService } from '../users/users.service';
import { ForgotPasswordDto, LoginDto, RegisterDto, ResetPasswordDto } from './dto';

const ACCESS_TOKEN_TTL = '15m';
const REFRESH_TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
const RESET_TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hour

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface RefreshSession {
  session: Session;
  user: User;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  async register(dto: RegisterDto): Promise<Omit<User, 'passwordHash'>> {
    const user = await this.usersService.create(dto);
    return this.toPublicUser(user);
  }

  async login(dto: LoginDto): Promise<AuthTokens & { user: Omit<User, 'passwordHash'> }> {
    const user = await this.validateCredentials(dto.email, dto.password);
    const tokens = await this.issueTokens(user);
    return { ...tokens, user: this.toPublicUser(user) };
  }

  async validateCredentials(email: string, password: string): Promise<User> {
    const user = await this.usersService.findByEmail(email);
    if (!user || user.deletedAt) {
      throw new UnauthorizedException('Invalid email or password.');
    }

    const matches = await bcrypt.compare(password, user.passwordHash);
    if (!matches) {
      throw new UnauthorizedException('Invalid email or password.');
    }

    return user;
  }

  // Validates the raw refresh token presented on the cookie. Cross-boundary and expiry
  // failures are both a 403 — presenting a dead token is never distinguished from a valid
  // one belonging to someone else.
  async validateRefreshToken(rawToken: string): Promise<RefreshSession> {
    const session = await this.prisma.session.findUnique({ where: { token: rawToken } });
    if (!session) {
      throw new ForbiddenException('Refresh token is invalid.');
    }

    if (session.expiresAt.getTime() <= Date.now()) {
      await this.prisma.session.delete({ where: { id: session.id } }).catch(() => undefined);
      throw new ForbiddenException('Refresh token has expired.');
    }

    // Re-check that the membership is still ACTIVE before re-issuing scopes — this is what
    // cuts off a suspended member on their very next refresh.
    if (session.organizationId) {
      const membership = await this.prisma.orgMembership.findUnique({
        where: {
          organizationId_userId: { organizationId: session.organizationId, userId: session.userId },
        },
      });
      if (!membership || membership.status !== 'ACTIVE' || membership.deletedAt) {
        await this.prisma.session.delete({ where: { id: session.id } }).catch(() => undefined);
        throw new ForbiddenException('Membership is no longer active.');
      }
    }

    const user = await this.usersService.findById(session.userId);
    if (!user || user.deletedAt) {
      throw new ForbiddenException('Account is no longer active.');
    }

    return { session, user };
  }

  // Rotation deletes the old row and issues a new one; the old refresh token is rejected
  // the moment this returns.
  async rotateRefreshToken({ session, user }: RefreshSession): Promise<AuthTokens> {
    await this.prisma.session.delete({ where: { id: session.id } });
    return this.issueTokens(user, session.organizationId ?? undefined);
  }

  async logout(rawToken: string | undefined): Promise<void> {
    if (!rawToken) return;
    await this.prisma.session.deleteMany({ where: { token: rawToken } });
  }

  async forgotPassword(dto: ForgotPasswordDto): Promise<void> {
    const user = await this.usersService.findByEmail(dto.email);
    // Always behave the same whether or not the account exists — the response must not
    // leak which emails are registered.
    if (!user) return;

    const rawToken = randomBytes(32).toString('hex');
    const tokenHash = this.hashOpaqueToken(rawToken);
    const expiresAt = new Date(Date.now() + RESET_TOKEN_TTL_MS);

    await this.usersService.setResetToken(user.id, tokenHash, expiresAt);

    // SMTP is optional for this build — log the link so it's usable in development.
    console.log(`Password reset link for ${user.email}: /reset-password?token=${rawToken}`);
  }

  async resetPassword(dto: ResetPasswordDto): Promise<void> {
    const tokenHash = this.hashOpaqueToken(dto.token);
    const user = await this.usersService.findByResetTokenHash(tokenHash);

    if (
      !user ||
      !user.resetPasswordExpiresAt ||
      user.resetPasswordExpiresAt.getTime() <= Date.now()
    ) {
      throw new UnauthorizedException('Reset token is invalid or has expired.');
    }

    const passwordHash = await bcrypt.hash(dto.newPassword, 10);
    await this.usersService.updatePassword(user.id, passwordHash);
  }

  private async issueTokens(user: User, organizationId?: string): Promise<AuthTokens> {
    const scopeInfo = organizationId
      ? await this.loadScopesForMembership(user.id, organizationId)
      : null;

    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      orgId: organizationId,
      membershipId: scopeInfo?.membershipId,
      scopes: scopeInfo?.scopes ?? [],
      isOrgAdmin: scopeInfo?.isOrgAdmin ?? false,
      isSuperAdmin: user.isSuperAdmin,
    };

    const accessToken = await this.jwt.signAsync(payload, {
      secret: this.config.getOrThrow('AT_SECRET'),
      expiresIn: ACCESS_TOKEN_TTL,
    });

    const refreshToken = randomBytes(40).toString('hex');
    await this.prisma.session.create({
      data: {
        token: refreshToken,
        userId: user.id,
        organizationId: organizationId ?? null,
        expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_MS),
      },
    });

    return { accessToken, refreshToken };
  }

  // Scopes are loaded by joining membership_roles → roles → role_permissions, merging into
  // a de-duplicated set, and setting isOrgAdmin if any assigned role has the flag.
  private async loadScopesForMembership(
    userId: string,
    organizationId: string,
  ): Promise<{ scopes: string[]; isOrgAdmin: boolean; membershipId: string } | null> {
    const membership = await this.prisma.orgMembership.findUnique({
      where: { organizationId_userId: { organizationId, userId } },
      include: { roles: { include: { role: { include: { permissions: true } } } } },
    });

    if (!membership || membership.status !== 'ACTIVE' || membership.deletedAt) {
      return null;
    }

    const scopes = new Set<string>();
    let isOrgAdmin = false;
    for (const membershipRole of membership.roles) {
      if (membershipRole.role.isOrgAdmin) isOrgAdmin = true;
      for (const rolePermission of membershipRole.role.permissions) {
        scopes.add(rolePermission.permissionId);
      }
    }

    return { scopes: [...scopes], isOrgAdmin, membershipId: membership.id };
  }

  private hashOpaqueToken(rawToken: string): string {
    // A fast, deterministic hash — unlike bcrypt, this needs to support an exact-match
    // lookup by a unique column, not a slow brute-force-resistant comparison. The tokens
    // being hashed are already high-entropy random bytes, so speed isn't a liability here.
    return createHash('sha256').update(rawToken).digest('hex');
  }

  private toPublicUser(user: User): Omit<User, 'passwordHash'> {
    const { passwordHash: _passwordHash, ...publicUser } = user;
    return publicUser;
  }
}
