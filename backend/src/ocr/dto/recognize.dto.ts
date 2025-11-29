import { IsNumber, IsOptional, IsArray } from 'class-validator';
import { Type } from 'class-transformer';

export class RecognizeDto {
  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  questionnaireVersionId?: number;
}

export class ParseOcrResultDto {
  @IsNumber()
  ocrResultId: number;

  @IsNumber()
  questionnaireVersionId: number;

  @IsOptional()
  @IsArray()
  @IsNumber({}, { each: true })
  @Type(() => Number)
  additionalOcrResultIds?: number[];
}

export class CreateAssessmentFromOcrDto {
  @IsNumber()
  ocrResultId: number;

  @IsNumber()
  childId: number;

  @IsNumber()
  questionnaireVersionId: number;
}
