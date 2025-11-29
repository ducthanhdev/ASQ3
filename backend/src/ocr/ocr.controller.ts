import {
  Controller,
  Post,
  UseInterceptors,
  UploadedFile,
  Body,
  UseGuards,
  Request,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OcrService } from './ocr.service';
import {
  RecognizeDto,
  ParseOcrResultDto,
  CreateAssessmentFromOcrDto,
} from './dto/recognize.dto';

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

  @Post('parse')
  async parseOcrResult(@Body() dto: ParseOcrResultDto) {
    const answers = await this.ocrService.parseOcrToAnswers(
      dto.ocrResultId,
      dto.questionnaireVersionId,
      dto.additionalOcrResultIds,
    );

    return {
      status: 'ok',
      answers,
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
}
