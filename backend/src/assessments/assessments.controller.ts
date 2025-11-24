import { Body, Controller, Get, Put, Delete, Param, ParseIntPipe, Post, Patch, UseGuards, Request } from '@nestjs/common';
import { CreateAssessmentDto } from './dto/create-assessment.dto';
import { UpdateAssessmentDto } from './dto/update-assessment.dto';
import { SubmitOnlineAssessmentDto } from './dto/submit-online-assessment.dto';
import { ReviewAssessmentDto } from './dto/review-assessment.dto';
import { AssessmentsService } from './assessments.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('assessments')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AssessmentsController {
  constructor(private service: AssessmentsService) {}

  @Get()
  @Roles('SPECIALIST', 'ADMIN')
  findAll() {
    return this.service.findAll();
  }

  @Get('my')
  findMy(@Request() req) {
    return this.service.findByParent(req.user.userId);
  }

  @Post()
  create(@Body() dto: CreateAssessmentDto, @Request() req) {
    return this.service.create(dto, req.user);
  }

  @Post('online/submit')
  submitOnline(@Body() dto: SubmitOnlineAssessmentDto, @Request() req) {
    return this.service.submitOnline(dto, req.user);
  }

  @Get(':id')
  getOne(@Param('id', ParseIntPipe) id: number, @Request() req) {
    return this.service.getOne(id, req.user);
  }

  @Put(':id')
  @Roles('SPECIALIST', 'ADMIN')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateAssessmentDto) {
    return this.service.update(id, dto);
  }

  @Patch(':id/review')
  @Roles('SPECIALIST', 'ADMIN')
  review(@Param('id', ParseIntPipe) id: number, @Body() dto: ReviewAssessmentDto, @Request() req) {
    return this.service.review(id, dto, req.user);
  }

  @Delete(':id')
  @Roles('ADMIN')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.service.remove(id);
  }
}
