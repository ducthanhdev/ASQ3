import {
  Controller,
  Post,
  Get,
  Param,
  ParseIntPipe,
  UseInterceptors,
  UploadedFile,
  Body,
  UseGuards,
  Request,
  Res,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OcrService } from './ocr.service';
import { RecognizeDto, CreateAssessmentFromOcrDto } from './dto/recognize.dto';

@Controller('api/ocr')
@UseGuards(JwtAuthGuard)
export class OcrController {
  constructor(private readonly ocrService: OcrService) {}

  @Post('recognize')
  @UseInterceptors(FileInterceptor('file'))
  async recognize(
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: RecognizeDto,
  ) {
    const result = await this.ocrService.recognizeFile(
      file,
      dto.questionnaireVersionId,
      dto.childId,
    );

    return {
      status: 'ok',
      result: {
        status: result.status,
        pages: result.pages,
        full_text: result.full_text,
        confidence: result.confidence,
        total_frames: result.total_frames,
      },
      ocrResultId: result.ocrResultId,
      fileId: result.fileId,
    };
  }

  @Post('create-assessment')
  async createAssessmentFromOcr(
    @Body() dto: CreateAssessmentFromOcrDto,
    @Request() req: any,
  ) {
    const result = await this.ocrService.createAssessmentFromOcr(
      dto.ocrResultId,
      dto.childId,
      dto.questionnaireVersionId,
      req.user.userId,
    );

    return {
      status: 'ok',
      ...result,
    };
  }

  @Get('files/child/:childId')
  async getFilesByChild(@Param('childId', ParseIntPipe) childId: number) {
    return this.ocrService.getFilesByChild(childId);
  }

  @Get('files/assessment/:assessmentId')
  async getFilesByAssessment(
    @Param('assessmentId', ParseIntPipe) assessmentId: number,
  ) {
    return this.ocrService.getFilesByAssessment(assessmentId);
  }

  @Get('files/:fileId')
  async getFile(
    @Param('fileId', ParseIntPipe) fileId: number,
    @Res() res: Response,
  ) {
    const file = await this.ocrService.getFileById(fileId);
    if (!file?.fileData) {
      return res.status(404).json({ message: 'File not found' });
    }

    const buffer = Buffer.from(file.fileData as Buffer);
    res.setHeader('Content-Type', file.mimeType || 'application/octet-stream');
    res.setHeader(
      'Content-Disposition',
      `inline; filename="${file.originalName}"`,
    );
    res.send(buffer);
  }
}
