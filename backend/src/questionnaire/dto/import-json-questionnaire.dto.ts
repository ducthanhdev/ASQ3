import { IsString, IsNotEmpty, IsInt, Min, IsObject } from 'class-validator';

export class ImportJsonQuestionnaireDto {
  @IsString()
  @IsNotEmpty()
  code: string;

  @IsString()
  @IsNotEmpty()
  title: string;

  @IsInt()
  @Min(0)
  minMonth: number;

  @IsInt()
  @Min(0)
  maxMonth: number;

  @IsString()
  @IsNotEmpty()
  language: string;

  @IsString()
  @IsNotEmpty()
  version: string;

  @IsObject()
  structure: any;
}

