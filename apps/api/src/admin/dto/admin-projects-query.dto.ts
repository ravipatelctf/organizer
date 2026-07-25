import { IsOptional, IsUUID } from 'class-validator';

// organizationId is an explicit, caller-supplied filter — never derived from AccessContext,
// since a superadmin's context carries no org of its own.
export class AdminProjectsQueryDto {
  @IsOptional()
  @IsUUID()
  organizationId?: string;
}
