import { randomBytes } from 'node:crypto';

import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { User } from '@prisma/client';
import * as bcrypt from 'bcrypt';

import { JwtPayload } from '../common/types/jwt-payload.type';
import { PrismaService } from '../prisma/prisma.service';
import { UsersService } from '../users/users.service';
import { LoginDto, RegisterDto } from './dto';

const ACCESS_TOKEN_TTL = '15m';
const REFRESH_TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
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

  private toPublicUser(user: User): Omit<User, 'passwordHash'> {
    const { passwordHash: _passwordHash, ...publicUser } = user;
    return publicUser;
  }
}
