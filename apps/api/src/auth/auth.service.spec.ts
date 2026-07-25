import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import * as bcrypt from 'bcrypt';

import { PrismaService } from '../prisma/prisma.service';
import { UsersService } from '../users/users.service';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  let service: AuthService;
  let usersService: { findByEmail: jest.Mock; findById: jest.Mock };
  let prisma: {
    session: { findUnique: jest.Mock; delete: jest.Mock; deleteMany: jest.Mock; create: jest.Mock };
    orgMembership: { findUnique: jest.Mock };
  };

  beforeEach(async () => {
    usersService = { findByEmail: jest.fn(), findById: jest.fn() };
    prisma = {
      session: {
        findUnique: jest.fn(),
        delete: jest.fn().mockResolvedValue(undefined),
        deleteMany: jest.fn(),
        create: jest.fn().mockResolvedValue(undefined),
      },
      orgMembership: { findUnique: jest.fn() },
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersService, useValue: usersService },
        { provide: PrismaService, useValue: prisma },
        {
          provide: JwtService,
          useValue: { signAsync: jest.fn().mockResolvedValue('signed.jwt.token') },
        },
        { provide: ConfigService, useValue: { getOrThrow: jest.fn().mockReturnValue('secret') } },
      ],
    }).compile();

    service = moduleRef.get(AuthService);
  });

  describe('validateCredentials', () => {
    it('rejects an unknown email', async () => {
      usersService.findByEmail.mockResolvedValue(null);
      await expect(service.validateCredentials('nobody@example.test', 'x')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('rejects a soft-deleted account', async () => {
      usersService.findByEmail.mockResolvedValue({ deletedAt: new Date(), passwordHash: 'h' });
      await expect(service.validateCredentials('gone@example.test', 'x')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('rejects a wrong password', async () => {
      const passwordHash = await bcrypt.hash('correct-password', 10);
      usersService.findByEmail.mockResolvedValue({ deletedAt: null, passwordHash });
      await expect(service.validateCredentials('a@example.test', 'wrong-password')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('accepts a correct password', async () => {
      const passwordHash = await bcrypt.hash('correct-password', 10);
      const user = { id: 'u1', deletedAt: null, passwordHash };
      usersService.findByEmail.mockResolvedValue(user);
      await expect(service.validateCredentials('a@example.test', 'correct-password')).resolves.toBe(
        user,
      );
    });
  });

  describe('validateRefreshToken', () => {
    it('rejects a token with no matching session', async () => {
      prisma.session.findUnique.mockResolvedValue(null);
      await expect(service.validateRefreshToken('missing')).rejects.toThrow(ForbiddenException);
    });

    it('rejects and deletes an expired session', async () => {
      prisma.session.findUnique.mockResolvedValue({
        id: 's1',
        expiresAt: new Date(Date.now() - 1000),
        organizationId: null,
        userId: 'u1',
      });
      await expect(service.validateRefreshToken('expired')).rejects.toThrow(ForbiddenException);
      expect(prisma.session.delete).toHaveBeenCalledWith({ where: { id: 's1' } });
    });

    it('rejects when the org membership is no longer active', async () => {
      prisma.session.findUnique.mockResolvedValue({
        id: 's1',
        expiresAt: new Date(Date.now() + 100000),
        organizationId: 'org1',
        userId: 'u1',
      });
      prisma.orgMembership.findUnique.mockResolvedValue({ status: 'SUSPENDED', deletedAt: null });
      await expect(service.validateRefreshToken('token')).rejects.toThrow(ForbiddenException);
      expect(prisma.session.delete).toHaveBeenCalledWith({ where: { id: 's1' } });
    });

    it('resolves session and user for a valid account-level token', async () => {
      const session = {
        id: 's1',
        expiresAt: new Date(Date.now() + 100000),
        organizationId: null,
        userId: 'u1',
      };
      const user = { id: 'u1', deletedAt: null };
      prisma.session.findUnique.mockResolvedValue(session);
      usersService.findById.mockResolvedValue(user);

      await expect(service.validateRefreshToken('token')).resolves.toEqual({ session, user });
    });
  });

  describe('rotateRefreshToken', () => {
    it('deletes the old session and issues a fresh token pair', async () => {
      const session = {
        id: 's1',
        organizationId: null,
        expiresAt: new Date(),
        userId: 'u1',
        token: 'old',
        createdAt: new Date(),
      };
      const user = { id: 'u1', email: 'a@example.test', isSuperAdmin: false };

      const tokens = await service.rotateRefreshToken({ session, user } as never);

      expect(prisma.session.delete).toHaveBeenCalledWith({ where: { id: 's1' } });
      expect(prisma.session.create).toHaveBeenCalled();
      expect(tokens.accessToken).toBe('signed.jwt.token');
      expect(tokens.refreshToken).toEqual(expect.any(String));
    });
  });
});
