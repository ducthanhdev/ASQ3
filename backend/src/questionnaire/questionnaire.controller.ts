import { Controller } from '@nestjs/common';
import { QuestionnaireService } from './questionnaire.service';

@Controller('questionnaires')
export class QuestionnaireController {
  constructor(private readonly questionnaireService: QuestionnaireService) {}
}

