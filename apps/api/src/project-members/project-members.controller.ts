import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { PERMS } from '@repo/permissions';

import { RequirePermissions } from '../common/decorators';
import { AccessContext, Ctx } from '../common/scope/access-context';
import { AddProjectMemberDto, UpdateProjectMemberDto } from './dto';
import { ProjectMembersService } from './project-members.service';

@ApiTags('project-members')
@Controller()
export class ProjectMembersController {
  constructor(private readonly projectMembersService: ProjectMembersService) {}

  // Visibility-only, like ProjectsController's list/getById — if you can see the project
  // you can see its roster.
  @Get('orgs/:orgSlug/projects/:projectId/members')
  list(@Ctx() ctx: AccessContext, @Param('projectId') projectId: string) {
    return this.projectMembersService.list(ctx, projectId);
  }

  @RequirePermissions(PERMS.project.manageMembers)
  @Post('orgs/:orgSlug/projects/:projectId/members')
  add(
    @Ctx() ctx: AccessContext,
    @Param('projectId') projectId: string,
    @Body() dto: AddProjectMemberDto,
  ) {
    return this.projectMembersService.add(ctx, projectId, dto);
  }

  @RequirePermissions(PERMS.project.manageMembers)
  @Patch('orgs/:orgSlug/projects/:projectId/members/:memberId')
  updateRole(
    @Ctx() ctx: AccessContext,
    @Param('projectId') projectId: string,
    @Param('memberId') projectMemberId: string,
    @Body() dto: UpdateProjectMemberDto,
  ) {
    return this.projectMembersService.updateRole(ctx, projectId, projectMemberId, dto);
  }

  @RequirePermissions(PERMS.project.manageMembers)
  @Delete('orgs/:orgSlug/projects/:projectId/members/:memberId')
  async remove(
    @Ctx() ctx: AccessContext,
    @Param('projectId') projectId: string,
    @Param('memberId') projectMemberId: string,
  ) {
    await this.projectMembersService.remove(ctx, projectId, projectMemberId);
    return { success: true };
  }
}
