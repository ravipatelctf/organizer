import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

import { AuthModule } from './auth/auth.module';
import { AtGuard } from './common/guards/at.guard';
import { OrgGuard } from './common/guards/org.guard';
import { PermissionsGuard } from './common/guards/permissions.guard';
import { ResolveOrgMiddleware } from './common/middleware/resolve-org.middleware';
import { ScopeModule } from './common/scope/scope.module';
import { HealthModule } from './health/health.module';
import { InvitationsModule } from './invitations/invitations.module';
import { MembersModule } from './members/members.module';
import { OrganizationsModule } from './organizations/organizations.module';
import { PrismaModule } from './prisma/prisma.module';
import { ProjectMembersModule } from './project-members/project-members.module';
import { ProjectsModule } from './projects/projects.module';
import { RolesModule } from './roles/roles.module';
import { UsersModule } from './users/users.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule.forRootAsync({
      isGlobal: true,
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const pool = new Pool({ connectionString: config.getOrThrow('DATABASE_URL') });
        return { prismaOptions: { adapter: new PrismaPg(pool) } };
      },
    }),
    ScopeModule,
    HealthModule,
    UsersModule,
    AuthModule,
    OrganizationsModule,
    MembersModule,
    InvitationsModule,
    RolesModule,
    ProjectsModule,
    ProjectMembersModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: AtGuard },
    { provide: APP_GUARD, useClass: OrgGuard },
    { provide: APP_GUARD, useClass: PermissionsGuard },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(ResolveOrgMiddleware).forRoutes('orgs/:orgSlug', 'orgs/:orgSlug/*splat');
  }
}
