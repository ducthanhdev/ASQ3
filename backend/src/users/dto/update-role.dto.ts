import { IsEnum, IsNotEmpty } from 'class-validator';

export class UpdateRoleDto {
  @IsEnum(['PARENT', 'SPECIALIST', 'ADMIN'])
  @IsNotEmpty()
  role: string;
}

