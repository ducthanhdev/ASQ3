import { IsString, IsNotEmpty, IsInt, IsNumber, Min, IsArray, ValidateNested, IsOptional, IsObject } from 'class-validator';
import { Type } from 'class-transformer';

class QuestionDto {
  @IsString()
  @IsNotEmpty()
  text: string;
}

class DomainDto {
  @IsString()
  @IsNotEmpty()
  key: string;

  @IsString()
  @IsNotEmpty()
  title: string;

  @IsNumber()
  @Min(0)
  cutoffScore: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => QuestionDto)
  questions: QuestionDto[];
}

class OverallQuestionDto {
  @IsString()
  @IsNotEmpty()
  text: string;
}

export class CreateManualQuestionnaireDto {
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
  @IsOptional()
  description?: string;

  @IsString()
  @IsNotEmpty()
  version: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DomainDto)
  domains: DomainDto[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OverallQuestionDto)
  overallQuestions: OverallQuestionDto[];

  @IsObject()
  @IsOptional()
  rules?: any;
}

