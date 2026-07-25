import { ArrayNotEmpty, IsArray, IsEmail, IsUUID } from 'class-validator';

export class CreateInvitationDto {
  @IsEmail()
  email!: string;

  @IsArray()
  @ArrayNotEmpty()
  @IsUUID('4', { each: true })
  roleIds!: string[];
}
