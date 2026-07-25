import { IsString, MinLength } from 'class-validator';

export class CheckSlugDto {
  @IsString()
  @MinLength(2)
  slug!: string;
}
