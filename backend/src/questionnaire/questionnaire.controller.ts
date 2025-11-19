import { Controller, Get, Param, ParseIntPipe } from '@nestjs/common';
import { QuestionnaireService } from './questionnaire.service';

@Controller('questionnaires')
export class QuestionnaireController {
  constructor(private readonly questionnaireService: QuestionnaireService) {}

  @Get()
  async findAll() {
    return this.questionnaireService.findAll();
  }

  @Get(':id/version/latest')
  async getLatestVersion(@Param('id', ParseIntPipe) id: number) {
    return this.questionnaireService.getLatestVersion(id);
  }
}

