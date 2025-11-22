import { IsInt, IsNotEmpty, IsObject, IsOptional, IsString, IsEnum, IsEmail, ValidateIf } from 'class-validator';

export class SubmitOnlineAssessmentDto {
  @IsInt()
  @IsNotEmpty()
  childId: number;

  @IsInt()
  @IsNotEmpty()
  questionnaireVersionId: number;

  @IsObject()
  @IsNotEmpty()
  answers: Record<string, string>;

  @IsString()
  @IsOptional()
  evaluatorFirstName?: string;

  @IsString()
  @IsOptional()
  evaluatorMiddleName?: string;

  @IsString()
  @IsOptional()
  evaluatorLastName?: string;

  @ValidateIf((o) => o.relationship !== '' && o.relationship !== null && o.relationship !== undefined)
  @IsEnum(['PARENT', 'GUARDIAN', 'TEACHER', 'CHILDCARE_PROVIDER', 'GRANDPARENT', 'FOSTER_PARENT', 'OTHER'])
  @IsOptional()
  relationship?: string;

  @IsString()
  @IsOptional()
  evaluatorAddress?: string;

  @IsString()
  @IsOptional()
  evaluatorHomePhone?: string;

  @IsString()
  @IsOptional()
  evaluatorOtherPhone?: string;

  @ValidateIf((o) => o.evaluatorEmail !== '' && o.evaluatorEmail !== null && o.evaluatorEmail !== undefined)
  @IsEmail()
  @IsOptional()
  evaluatorEmail?: string;

  @IsString()
  @IsOptional()
  helperName?: string;

  @IsString()
  @IsOptional()
  programRegistrationNumber?: string;

  @IsString()
  @IsOptional()
  programName?: string;
}
