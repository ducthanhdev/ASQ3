import { IsString, IsNotEmpty, IsDateString, IsInt, IsOptional, Min } from 'class-validator';

export class CreateChildDto {
  @IsString()
  @IsNotEmpty()
  fullName: string;

  @IsDateString()
  birthDate: string;

  @IsInt()
  @IsOptional()
  @Min(0)
  prematureWeeks?: number;
}

