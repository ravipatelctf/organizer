import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { PERMS } from '@repo/permissions';

import { RequirePermissions } from '../common/decorators';
import { AccessContext, Ctx } from '../common/scope/access-context';
import { CreateTaskDto, UpdateTaskDto } from './dto';
import { TasksService } from './tasks.service';

@ApiTags('tasks')
@Controller()
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  // No @RequirePermissions() — visibility-only, like ProjectsController.list. If you can
  // see the project you can see its tasks; taskWhere(ctx) is itself the authorization.
  @Get('orgs/:orgSlug/projects/:projectId/tasks')
  list(@Ctx() ctx: AccessContext, @Param('projectId') projectId: string) {
    return this.tasksService.list(ctx, projectId);
  }

  @RequirePermissions(PERMS.task.create)
  @Post('orgs/:orgSlug/projects/:projectId/tasks')
  create(
    @Ctx() ctx: AccessContext,
    @Param('projectId') projectId: string,
    @Body() dto: CreateTaskDto,
  ) {
    return this.tasksService.create(ctx, projectId, dto);
  }

  // Deliberately not nested under :projectId — taskWhere(ctx) resolves visibility through
  // the project on its own, so a task id from another org or project still 404s even
  // though ProjectScopeGuard no-ops on a route with no :projectId param.
  @RequirePermissions(PERMS.task.edit)
  @Patch('orgs/:orgSlug/tasks/:id')
  update(@Ctx() ctx: AccessContext, @Param('id') taskId: string, @Body() dto: UpdateTaskDto) {
    return this.tasksService.update(ctx, taskId, dto);
  }

  @RequirePermissions(PERMS.task.delete)
  @Delete('orgs/:orgSlug/tasks/:id')
  async remove(@Ctx() ctx: AccessContext, @Param('id') taskId: string) {
    await this.tasksService.remove(ctx, taskId);
    return { success: true };
  }
}
