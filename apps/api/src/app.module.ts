import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

import { AuthModule } from './auth/auth.module';
import { AtGuard } from './common/guards/at.guard';
import { HealthModule } from './health/health.module';
import { OrganizationsModule } from './organizations/organizations.module';
import { PrismaModule } from './prisma/prisma.module';
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
    HealthModule,
    UsersModule,
    AuthModule,
    OrganizationsModule,
  ],
  providers: [{ provide: APP_GUARD, useClass: AtGuard }],
})
export class AppModule {}
