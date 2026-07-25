import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { PERMS } from '@repo/permissions';

import { RequirePermissions } from '../common/decorators';
import { AccessContext, Ctx } from '../common/scope/access-context';
import { CreateProjectDto, UpdateProjectDto } from './dto';
import { ProjectsService } from './projects.service';

// Every project-id route param here is named :projectId, not :id — ProjectScopeGuard
// looks up that literal name to decide whether it applies to a given route. This is the
// one intentional break from the :id convention used elsewhere in the app.
@ApiTags('projects')
@Controller()
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  // No @RequirePermissions() here — projectWhere(ctx) is itself the authorization and
  // self-throws 403 on 'none'. Adding the decorator would 403 every view-own-projects-only
  // actor (every Member and Project Manager), since PermissionsGuard has no notion of "own".
  @Get('orgs/:orgSlug/projects')
  list(@Ctx() ctx: AccessContext) {
    return this.projectsService.list(ctx);
  }

  @RequirePermissions(PERMS.project.create)
  @Post('orgs/:orgSlug/projects')
  create(@Ctx() ctx: AccessContext, @Body() dto: CreateProjectDto) {
    return this.projectsService.create(ctx, dto);
  }

  @Get('orgs/:orgSlug/projects/:projectId')
  getById(@Ctx() ctx: AccessContext, @Param('projectId') projectId: string) {
    return this.projectsService.getById(ctx, projectId);
  }

  @RequirePermissions(PERMS.project.edit)
  @Patch('orgs/:orgSlug/projects/:projectId')
  update(
    @Ctx() ctx: AccessContext,
    @Param('projectId') projectId: string,
    @Body() dto: UpdateProjectDto,
  ) {
    return this.projectsService.update(ctx, projectId, dto);
  }

  @RequirePermissions(PERMS.project.archive)
  @Post('orgs/:orgSlug/projects/:projectId/archive')
  @HttpCode(HttpStatus.OK)
  archive(@Ctx() ctx: AccessContext, @Param('projectId') projectId: string) {
    return this.projectsService.archive(ctx, projectId);
  }

  @RequirePermissions(PERMS.project.delete)
  @Delete('orgs/:orgSlug/projects/:projectId')
  async remove(@Ctx() ctx: AccessContext, @Param('projectId') projectId: string) {
    await this.projectsService.remove(ctx, projectId);
    return { success: true };
  }
}
