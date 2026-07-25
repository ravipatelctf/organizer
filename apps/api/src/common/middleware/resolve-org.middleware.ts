import { Injectable, NestMiddleware, NotFoundException } from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';

import { PrismaService } from '../../prisma/prisma.service';

// The single point where tenant identity enters the system from the URL. The slug is
// client-supplied and carries no authority — it only names which organization is being
// addressed. OrgGuard is what decides whether the verified JWT is allowed to act on it.
@Injectable()
export class ResolveOrgMiddleware implements NestMiddleware {
  constructor(private readonly prisma: PrismaService) {}

  async use(req: Request, _res: Response, next: NextFunction): Promise<void> {
    const orgSlug = req.params.orgSlug as string | undefined;
    if (!orgSlug) {
      next();
      return;
    }

    const organization = await this.prisma.organization.findUnique({
      where: { slug: orgSlug },
    });

    if (!organization || organization.deletedAt) {
      throw new NotFoundException('Organization not found.');
    }

    req.organization = organization;
    next();
  }
}
