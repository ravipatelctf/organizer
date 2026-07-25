import { randomUUID } from 'node:crypto';

import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { isValidPermissionId } from '@repo/permissions';

import { PrismaService } from '../prisma/prisma.service';
import { CreateRoleDto, UpdateRoleDto } from './dto';

@Injectable()
export class RolesService {
  constructor(private readonly prisma: PrismaService) {}

  listForOrg(organizationId: string) {
    return this.prisma.role.findMany({
      where: { organizationId, deletedAt: null },
      include: { permissions: true },
      orderBy: { rank: 'asc' },
    });
  }

  async create(organizationId: string, dto: CreateRoleDto): Promise<Role> {
    this.assertValidPermissionIds(dto.permissionIds);

    const nameTaken = await this.prisma.role.findUnique({
      where: { organizationId_name: { organizationId, name: dto.name } },
    });
    if (nameTaken) {
      throw new ConflictException('A role with this name already exists.');
    }

    const roleId = randomUUID();

    return this.prisma.$transaction(async (tx) => {
      const role = await tx.role.create({
        data: {
          id: roleId,
          organizationId,
          name: dto.name,
          description: dto.description,
          rank: dto.rank,
          isOrgAdmin: false,
          isSystemRole: false,
        },
      });

      await tx.rolePermission.createMany({
        data: dto.permissionIds.map((permissionId) => ({ roleId, permissionId })),
      });

      return role;
    });
  }

  async update(organizationId: string, roleId: string, dto: UpdateRoleDto): Promise<Role> {
    const role = await this.findInOrg(organizationId, roleId);
    if (role.isSystemRole) {
      throw new ConflictException('System roles cannot be edited.');
    }
    if (dto.permissionIds) {
      this.assertValidPermissionIds(dto.permissionIds);
    }

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.role.update({
        where: { id: roleId },
        data: {
          ...(dto.name !== undefined ? { name: dto.name } : {}),
          ...(dto.description !== undefined ? { description: dto.description } : {}),
          ...(dto.rank !== undefined ? { rank: dto.rank } : {}),
        },
      });

      if (dto.permissionIds) {
        await tx.rolePermission.deleteMany({ where: { roleId } });
        await tx.rolePermission.createMany({
          data: dto.permissionIds.map((permissionId) => ({ roleId, permissionId })),
        });
      }

      return updated;
    });
  }

  async remove(organizationId: string, roleId: string): Promise<void> {
    const role = await this.findInOrg(organizationId, roleId);
    if (role.isSystemRole) {
      throw new ConflictException('System roles cannot be deleted.');
    }

    await this.prisma.role.delete({ where: { id: roleId } });
  }

  // Cross-boundary role ids are a 404, not a 403 — the same isolation principle Phase 6
  // formalizes for projects and tasks.
  private async findInOrg(organizationId: string, roleId: string): Promise<Role> {
    const role = await this.prisma.role.findUnique({ where: { id: roleId } });
    if (!role || role.organizationId !== organizationId || role.deletedAt) {
      throw new NotFoundException('Role not found.');
    }
    return role;
  }

  private assertValidPermissionIds(permissionIds: string[]): void {
    const unknown = permissionIds.filter((id) => !isValidPermissionId(id));
    if (unknown.length > 0) {
      throw new BadRequestException(`Unknown permission id(s): ${unknown.join(', ')}`);
    }
  }
}
