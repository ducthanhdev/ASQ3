import {
  IsString,
  IsNotEmpty,
  IsDateString,
  IsInt,
  IsOptional,
  IsEnum,
  Min,
} from 'class-validator';

export class CreateChildDto {
  @IsString()
  @IsNotEmpty()
  firstName: string;

  @IsString()
  @IsOptional()
  middleName?: string;

  @IsString()
  @IsNotEmpty()
  lastName: string;

  @IsEnum(['MALE', 'FEMALE', 'OTHER'])
  gender: string;

  @IsDateString()
  birthDate: string;

  @IsInt()
  @IsOptional()
  @Min(0)
  prematureWeeks?: number;

  @IsString()
  @IsOptional()
  guardianName?: string;

  @IsString()
  @IsOptional()
  guardianPhone?: string;

  @IsString()
  @IsOptional()
  note?: string;

  @IsString()
  @IsOptional()
  registrationNumber?: string;
}
