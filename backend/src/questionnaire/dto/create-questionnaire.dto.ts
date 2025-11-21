import { IsString, IsNotEmpty, IsInt, Min } from 'class-validator';

export class CreateQuestionnaireDto {
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
}

