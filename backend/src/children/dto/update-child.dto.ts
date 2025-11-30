import {
  IsString,
  IsDateString,
  IsInt,
  IsOptional,
  IsEnum,
  Min,
} from 'class-validator';

export class UpdateChildDto {
  @IsString()
  @IsOptional()
  firstName?: string;

  @IsString()
  @IsOptional()
  middleName?: string;

  @IsString()
  @IsOptional()
  lastName?: string;

  @IsEnum(['MALE', 'FEMALE', 'OTHER'])
  @IsOptional()
  gender?: string;

  @IsDateString()
  @IsOptional()
  birthDate?: string;

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
