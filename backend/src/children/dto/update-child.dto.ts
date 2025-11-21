import { IsString, IsDateString, IsInt, IsOptional, Min } from 'class-validator';

export class UpdateChildDto {
  @IsString()
  @IsOptional()
  fullName?: string;

  @IsDateString()
  @IsOptional()
  birthDate?: string;

  @IsInt()
  @IsOptional()
  @Min(0)
  prematureWeeks?: number;
}

