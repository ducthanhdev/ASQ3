import {
  Controller,
  Get,
  Param,
  ParseIntPipe,
  UseGuards,
  Res,
} from '@nestjs/common';
import { Response } from 'express';
import { ReportsService } from './reports.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';

@Controller('assessments')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ReportsController {
  constructor(private reportsService: ReportsService) {}

  @Get(':id/report')
  async getReport(@Param('id', ParseIntPipe) id: number, @Res() res: Response) {
    const pdf = await this.reportsService.generatePDF(id);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="asq3-report-${id}.pdf"`,
    );
    res.send(pdf);
  }
}
