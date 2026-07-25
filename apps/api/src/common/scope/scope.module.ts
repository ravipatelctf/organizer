import { Global, Module } from '@nestjs/common';

import { ProjectAccessService } from './project-access.service';

// Global because ProjectScopeGuard is an APP_GUARD resolved from the root injector, and
// every feature module touching projects needs the same singleton — one choke point, one
// provider.
@Global()
@Module({
  providers: [ProjectAccessService],
  exports: [ProjectAccessService],
})
export class ScopeModule {}
