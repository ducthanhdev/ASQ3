import { IsObject, IsString, IsOptional } from 'class-validator';

export class UpdateAssessmentDto {
  @IsObject()
  @IsOptional()
  answersJson?: any;

  @IsObject()
  @IsOptional()
  scoresJson?: any;

  @IsObject()
  @IsOptional()
  summaryResultJson?: any;

  @IsString()
  @IsOptional()
  finalConclusion?: string;
}

