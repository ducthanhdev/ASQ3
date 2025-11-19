import { IsNotEmpty, IsObject, IsNumber } from 'class-validator';

export class CreateAssessmentDto {
  @IsNumber()
  @IsNotEmpty()
  childId: number;

  @IsNumber()
  @IsNotEmpty()
  questionnaireVersionId: number;

  @IsObject()
  @IsNotEmpty()
  answers: any;
}

