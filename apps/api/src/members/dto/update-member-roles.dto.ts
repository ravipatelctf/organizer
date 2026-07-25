import { ArrayNotEmpty, IsArray, IsUUID } from 'class-validator';

export class UpdateMemberRolesDto {
  @IsArray()
  @ArrayNotEmpty()
  @IsUUID('4', { each: true })
  roleIds!: string[];
}
