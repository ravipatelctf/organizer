import { IsIn, IsOptional, IsUUID } from 'class-validator';

import { PROJECT_MEMBER_ROLES, ProjectMemberRole } from './project-member-role';

export class AddProjectMemberDto {
  @IsUUID()
  orgMembershipId!: string;

  @IsOptional()
  @IsIn(PROJECT_MEMBER_ROLES)
  role?: ProjectMemberRole;
}
