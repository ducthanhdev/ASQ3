import { IsNumber, IsOptional, IsArray } from 'class-validator';
import { Type } from 'class-transformer';

export class RecognizeDto {
  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  questionnaireVersionId?: number;

  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  childId?: number;
}

export class CreateAssessmentFromOcrDto {
  @IsNumber()
  ocrResultId: number;

  @IsNumber()
  childId: number;

  @IsNumber()
  questionnaireVersionId: number;
}
