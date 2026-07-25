import { randomBytes } from 'node:crypto';

import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { OrgMembership } from '@prisma/client';

import { hashOpaqueToken } from '../common/utils/opaque-token.util';
import { PrismaService } from '../prisma/prisma.service';
import { CreateInvitationDto } from './dto';

const INVITATION_TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

@Injectable()
export class InvitationsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    organizationId: string,
    invitedById: string,
    dto: CreateInvitationDto,
  ): Promise<{ membership: OrgMembership; token: string }> {
    const invitee = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (!invitee || invitee.deletedAt) {
      throw new NotFoundException('No account with that email — ask them to register first.');
    }

    const existing = await this.prisma.orgMembership.findUnique({
      where: { organizationId_userId: { organizationId, userId: invitee.id } },
    });
    if (existing) {
      throw new ConflictException('This person already has a membership in this organization.');
    }

    await this.assertRolesBelongToOrg(organizationId, dto.roleIds);

    const rawToken = randomBytes(32).toString('hex');
    const invitationTokenHash = hashOpaqueToken(rawToken);
    const invitationExpiresAt = new Date(Date.now() + INVITATION_TOKEN_TTL_MS);

    const membership = await this.prisma.$transaction(async (tx) => {
      const created = await tx.orgMembership.create({
        data: {
          organizationId,
          userId: invitee.id,
          status: 'INVITED',
          invitedById,
          invitationTokenHash,
          invitationExpiresAt,
        },
      });

      await tx.membershipRole.createMany({
        data: dto.roleIds.map((roleId) => ({ orgMembershipId: created.id, roleId })),
      });

      return created;
    });

    return { membership, token: rawToken };
  }

  listForOrg(organizationId: string) {
    return this.prisma.orgMembership.findMany({
      where: { organizationId, status: 'INVITED', deletedAt: null },
      include: { user: true, roles: { include: { role: true } } },
      orderBy: { createdAt: 'asc' },
    });
  }

  async revoke(organizationId: string, invitationId: string): Promise<void> {
    const invitation = await this.prisma.orgMembership.findUnique({
      where: { id: invitationId },
    });
    if (
      !invitation ||
      invitation.organizationId !== organizationId ||
      invitation.status !== 'INVITED' ||
      invitation.deletedAt
    ) {
      throw new NotFoundException('Invitation not found.');
    }

    await this.prisma.orgMembership.delete({ where: { id: invitationId } });
  }

  // The token proves possession of the invite; matching userId proves it's being redeemed
  // by the person it was issued to, not merely someone who intercepted the link.
  async accept(userId: string, rawToken: string): Promise<OrgMembership> {
    const invitationTokenHash = hashOpaqueToken(rawToken);
    const invitation = await this.prisma.orgMembership.findUnique({
      where: { invitationTokenHash },
    });

    if (
      !invitation ||
      invitation.status !== 'INVITED' ||
      !invitation.invitationExpiresAt ||
      invitation.invitationExpiresAt.getTime() <= Date.now()
    ) {
      throw new UnauthorizedException('Invitation is invalid or has expired.');
    }

    if (invitation.userId !== userId) {
      throw new ForbiddenException('This invitation was not issued to you.');
    }

    return this.prisma.orgMembership.update({
      where: { id: invitation.id },
      data: {
        status: 'ACTIVE',
        joinedAt: new Date(),
        invitationTokenHash: null,
        invitationExpiresAt: null,
      },
    });
  }

  private async assertRolesBelongToOrg(organizationId: string, roleIds: string[]): Promise<void> {
    const matching = await this.prisma.role.count({
      where: { id: { in: roleIds }, organizationId, deletedAt: null },
    });
    if (matching !== roleIds.length) {
      throw new BadRequestException('One or more roles do not belong to this organization.');
    }
  }
}
