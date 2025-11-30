import { IsEnum, IsOptional, IsString } from 'class-validator';

export class ReviewAssessmentDto {
  @IsEnum(['APPROVED', 'REJECTED'])
  status: string;

  @IsString()
  @IsOptional()
  notes?: string;
}
