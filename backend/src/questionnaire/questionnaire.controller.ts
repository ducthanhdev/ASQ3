import { Controller, Get, Post, Put, Delete, Body, Param, ParseIntPipe, UseGuards, Query } from '@nestjs/common';
import { QuestionnaireService } from './questionnaire.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CreateQuestionnaireDto } from './dto/create-questionnaire.dto';
import { UpdateQuestionnaireDto } from './dto/update-questionnaire.dto';
import { CreateManualQuestionnaireDto } from './dto/create-manual-questionnaire.dto';
import { ImportJsonQuestionnaireDto } from './dto/import-json-questionnaire.dto';
import { CreateVersionDto } from './dto/create-version.dto';

@Controller('questionnaires')
@UseGuards(JwtAuthGuard, RolesGuard)
export class QuestionnaireController {
  constructor(private readonly questionnaireService: QuestionnaireService) {}

  @Get()
  findAll() {
    return this.questionnaireService.findAll();
  }

  @Get('auto-select')
  autoSelect(@Query('childId', ParseIntPipe) childId: number) {
    return this.questionnaireService.autoSelect(childId);
  }

  @Get(':id')
  @Roles('SPECIALIST', 'ADMIN')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.questionnaireService.findOne(id);
  }

  @Get(':id/version/latest')
  getLatestVersion(@Param('id', ParseIntPipe) id: number) {
    return this.questionnaireService.getLatestVersion(id);
  }

  @Get(':id/versions')
  @Roles('ADMIN')
  getVersions(@Param('id', ParseIntPipe) id: number) {
    return this.questionnaireService.getVersions(id);
  }

  @Post()
  @Roles('ADMIN')
  create(@Body() dto: CreateQuestionnaireDto) {
    return this.questionnaireService.create(dto);
  }

  @Post('create-manual')
  @Roles('ADMIN')
  createManual(@Body() dto: CreateManualQuestionnaireDto) {
    return this.questionnaireService.createManual(dto);
  }

  @Post('import-json')
  @Roles('ADMIN')
  importJson(@Body() dto: ImportJsonQuestionnaireDto) {
    return this.questionnaireService.importJson(dto);
  }

  @Post(':id/version')
  @Roles('ADMIN')
  createVersion(@Param('id', ParseIntPipe) id: number, @Body() dto: CreateVersionDto) {
    return this.questionnaireService.createVersion(id, dto);
  }

  @Put(':id')
  @Roles('ADMIN')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateQuestionnaireDto) {
    return this.questionnaireService.update(id, dto);
  }

  @Delete(':id')
  @Roles('ADMIN')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.questionnaireService.remove(id);
  }
}

