import { Test } from '@nestjs/testing';
import * as bcrypt from 'bcrypt';

import { PrismaService } from '../prisma/prisma.service';
import { UsersService } from './users.service';

describe('UsersService', () => {
  let service: UsersService;
  let prisma: {
    user: {
      findUnique: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
    };
  };

  beforeEach(async () => {
    prisma = {
      user: {
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
    };

    const moduleRef = await Test.createTestingModule({
      providers: [UsersService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = moduleRef.get(UsersService);
  });

  describe('create', () => {
    it('hashes the password rather than storing it in plain text', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      prisma.user.create.mockImplementation(({ data }) => Promise.resolve({ id: 'u1', ...data }));

      const user = await service.create({
        email: 'alice@example.test',
        password: 'password123',
        firstName: 'Alice',
        lastName: 'Anderson',
      });

      expect(user.passwordHash).not.toBe('password123');
      expect(await bcrypt.compare('password123', user.passwordHash)).toBe(true);
    });

    it('rejects a duplicate email', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'existing' });

      await expect(
        service.create({
          email: 'alice@example.test',
          password: 'password123',
          firstName: 'Alice',
          lastName: 'Anderson',
        }),
      ).rejects.toThrow('An account with this email already exists.');

      expect(prisma.user.create).not.toHaveBeenCalled();
    });
  });

  describe('findByEmail', () => {
    it('looks the user up by the unique email column', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'u1', email: 'alice@example.test' });

      const user = await service.findByEmail('alice@example.test');

      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { email: 'alice@example.test' },
      });
      expect(user?.id).toBe('u1');
    });
  });

  describe('updatePassword', () => {
    it('clears any pending reset token when the password changes', async () => {
      prisma.user.update.mockResolvedValue({ id: 'u1' });

      await service.updatePassword('u1', 'new-hash');

      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'u1' },
        data: {
          passwordHash: 'new-hash',
          resetPasswordTokenHash: null,
          resetPasswordExpiresAt: null,
        },
      });
    });
  });
});
