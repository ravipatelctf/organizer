import {
  DynamicModule,
  InjectionToken,
  Module,
  OptionalFactoryDependency,
  Provider,
} from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

import { PrismaService } from './prisma.service';

type PrismaClientOptions = ConstructorParameters<typeof PrismaClient>[0];

export interface PrismaModuleAsyncOptions {
  isGlobal?: boolean;
  inject?: Array<InjectionToken | OptionalFactoryDependency>;
  useFactory: (
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ...args: any[]
  ) => { prismaOptions?: PrismaClientOptions } | Promise<{ prismaOptions?: PrismaClientOptions }>;
}

@Module({})
export class PrismaModule {
  static forRootAsync(options: PrismaModuleAsyncOptions): DynamicModule {
    const prismaServiceProvider: Provider = {
      provide: PrismaService,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      useFactory: async (...args: any[]) => {
        const { prismaOptions } = await options.useFactory(...args);
        return new PrismaService(prismaOptions);
      },
      inject: options.inject ?? [],
    };

    return {
      module: PrismaModule,
      global: options.isGlobal ?? false,
      providers: [prismaServiceProvider],
      exports: [prismaServiceProvider],
    };
  }
}
