import { IsString, IsInt, IsOptional, Min } from 'class-validator';

export class UpdateQuestionnaireDto {
  @IsString()
  @IsOptional()
  title?: string;

  @IsInt()
  @IsOptional()
  @Min(0)
  minMonth?: number;

  @IsInt()
  @IsOptional()
  @Min(0)
  maxMonth?: number;

  @IsString()
  @IsOptional()
  language?: string;
}
