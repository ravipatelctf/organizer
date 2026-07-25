import { IsIn } from 'class-validator';

import { PROJECT_MEMBER_ROLES, ProjectMemberRole } from './project-member-role';

export class UpdateProjectMemberDto {
  @IsIn(PROJECT_MEMBER_ROLES)
  role!: ProjectMemberRole;
}
