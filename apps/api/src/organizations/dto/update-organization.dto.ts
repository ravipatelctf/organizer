import { Prisma } from '@prisma/client';
import { IsObject, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class UpdateOrganizationDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(255)
  name?: string;

  @IsOptional()
  @IsObject()
  settings?: Prisma.InputJsonValue;
}
