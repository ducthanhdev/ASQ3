import { IsString, IsNotEmpty, IsObject } from 'class-validator';

export class CreateVersionDto {
  @IsString()
  @IsNotEmpty()
  version: string;

  @IsObject()
  structure: any;
}

