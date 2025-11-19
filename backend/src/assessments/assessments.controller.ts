import { Body, Controller, Get, Param, ParseIntPipe, Post } from '@nestjs/common';
import { CreateAssessmentDto } from './dto/create-assessment.dto';
import { AssessmentsService } from './assessments.service';

@Controller('assessments')
export class AssessmentsController {
  constructor(private service: AssessmentsService) {}

  @Post()
  create(@Body() dto: CreateAssessmentDto) {
    return this.service.create(dto);
  }

  @Get(':id')
  async getOne(@Param('id', ParseIntPipe) id: number) {
    return this.service.getOne(id);
  }
}
