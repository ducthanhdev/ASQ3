import {
  IsString,
  IsEmail,
  IsEnum,
  IsOptional,
  MinLength,
} from 'class-validator';

export class UpdateUserDto {
  @IsEmail()
  @IsOptional()
  email?: string;

  @IsString()
  @IsOptional()
  @MinLength(6)
  password?: string;

  @IsEnum(['PARENT', 'SPECIALIST', 'ADMIN'])
  @IsOptional()
  role?: string;
}
