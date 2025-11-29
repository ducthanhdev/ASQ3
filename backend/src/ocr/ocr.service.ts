import {
  Injectable,
  HttpException,
  HttpStatus,
  Logger,
  NotFoundException,
  BadGatewayException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import * as fs from 'fs';
import * as path from 'path';
import fetch from 'node-fetch';

const FormData = require('form-data');

export interface OcrTextItem {
  text: string;
  bbox: number[];
  conf: number;
}

export interface OcrPage {
  frame_index: number;
  width: number;
  height: number;
  texts: OcrTextItem[];
  question_numbers?: number[];
  image?: string | number[];
}

export interface OcrResponse {
  status: string;
  pages: OcrPage[];
  full_text: string;
  confidence: number;
  total_frames: number;
  file_data?: string;
  file_name?: string;
}

export interface OcrResponseWithIds extends OcrResponse {
  ocrResultId: number;
  fileId: number;
}

@Injectable()
export class OcrService {
  private readonly logger = new Logger(OcrService.name);
  private readonly ocrServiceUrl: string;
  private readonly tmpDir: string;

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
  ) {
    this.ocrServiceUrl =
      this.configService.get<string>('OCR_SERVICE_URL') ||
      'http://localhost:8000';
    this.tmpDir = path.join(process.cwd(), 'tmp');
  }

  async recognizeFile(
    file: Express.Multer.File,
    questionnaireVersionId?: number,
  ): Promise<OcrResponseWithIds> {
    if (!file) {
      throw new HttpException('No file provided', HttpStatus.BAD_REQUEST);
    }

    if (!fs.existsSync(this.tmpDir)) {
      fs.mkdirSync(this.tmpDir, { recursive: true });
    }

    const tmpPath = path.join(
      this.tmpDir,
      `${Date.now()}_${file.originalname}`,
    );

    try {
      fs.writeFileSync(tmpPath, file.buffer);
      const ocrResult = await this.callOcrService(tmpPath, file);
      const savedFile = await this.saveFile(file, tmpPath);
      const ocrResultRecord = await this.saveOcrResult(
        savedFile.id,
        questionnaireVersionId,
        ocrResult,
      );

      return {
        ...ocrResult,
        ocrResultId: ocrResultRecord.id,
        fileId: savedFile.id,
      };
    } catch (error) {
      this.logger.error(`OCR processing failed: ${error.message}`, error.stack);
      if (fs.existsSync(tmpPath)) {
        fs.unlinkSync(tmpPath);
      }
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        `OCR processing failed: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async parseOcrToAnswers(
    ocrResultId: number,
    questionnaireVersionId: number,
    additionalOcrResultIds?: number[],
  ): Promise<Record<string, string>> {
    const ocrResultIds = [ocrResultId, ...(additionalOcrResultIds || [])];

    const ocrResults = await Promise.all(
      ocrResultIds.map((id) =>
        this.prisma.ocrResult.findUnique({ where: { id } }),
      ),
    );

    const validOcrResults = ocrResults.filter((r) => r !== null);
    if (validOcrResults.length === 0) {
      throw new NotFoundException('No valid OCR results found');
    }

    const version = await this.prisma.questionnaireVersion.findUnique({
      where: { id: questionnaireVersionId },
    });

    if (!version) {
      throw new NotFoundException('Questionnaire version not found');
    }

    const structure = version.structureJson as any;
    const questionIds = this.extractQuestionIds(structure);

    const allPages: OcrPage[] = [];
    let combinedFullText = '';
    let mainFileId: number | undefined;

    for (const ocrResult of validOcrResults) {
      if (ocrResult.bboxJson) {
        const pages = ocrResult.bboxJson as any as OcrPage[];
        allPages.push(...pages);
      }
      if (ocrResult.rawText) {
        combinedFullText += ocrResult.rawText + '\n';
      }
      if (!mainFileId && ocrResult.fileId) {
        mainFileId = ocrResult.fileId;
      }
    }

    let answers: Record<string, string>;
    
    try {
      if (mainFileId) {
        const file = await this.prisma.file.findUnique({ where: { id: mainFileId } });
        if (file && fs.existsSync(file.storagePath)) {
          this.logger.debug(`Reading file_data from file storage, mainFileId: ${mainFileId}, path: ${file.storagePath}`);
          answers = await this.callParseService(allPages, questionIds, mainFileId);
        } else {
          this.logger.warn(`File not found in storage: fileId=${mainFileId}, path=${file?.storagePath}. File may have been deleted.`);
          throw new Error('File not found in storage');
        }
      } else {
        this.logger.warn(`No fileId found in OCR results. mainFileId=${mainFileId}. YOLO parser may not work.`);
        answers = await this.callParseService(allPages, questionIds, undefined);
      }
      this.logger.log(`Successfully parsed ${Object.keys(answers).length} answers using YOLO parser`);
    } catch (error) {
      this.logger.warn(`YOLO parser failed: ${error.message}, falling back to OCR parser`);
      answers = this.parseAnswersFromText(
        combinedFullText,
        questionIds,
        allPages,
        structure,
      );
    }

    await this.prisma.ocrResult.update({
      where: { id: ocrResultId },
      data: {
        parsedAnswersJson: answers,
        questionnaireVersionId,
      },
    });

    return answers;
  }

  async createAssessmentFromOcr(
    ocrResultId: number,
    childId: number,
    questionnaireVersionId: number,
    userId: number,
  ) {
    const answers = await this.parseOcrToAnswers(
      ocrResultId,
      questionnaireVersionId,
    );

    const ocrResult = await this.prisma.ocrResult.findUnique({
      where: { id: ocrResultId },
      include: { file: true },
    });

    if (!ocrResult?.file) {
      throw new NotFoundException('OCR result or file not found');
    }

    const version = await this.prisma.questionnaireVersion.findUnique({
      where: { id: questionnaireVersionId },
      include: { questionnaire: true },
    });

    if (!version) {
      throw new NotFoundException('Questionnaire version not found');
    }

    const structure = version.structureJson as any;
    const domainTotals = this.calculateDomainScores(structure, answers);
    const { domainScores, finalConclusion } = this.classifyResults(
      structure,
      domainTotals,
    );

    const assessment = await this.prisma.assessment.create({
      data: {
        childId,
        questionnaireVersionId,
        evaluatorId: userId,
        assessmentDate: new Date(),
        completionDate: new Date(),
        answersJson: answers,
        scoresJson: domainScores,
        summaryResultJson: { domainScores, finalConclusion },
        finalConclusion,
        status: 'PENDING_REVIEW',
        method: 'SCAN',
        scanFileId: ocrResult.file.id,
      },
      include: {
        child: true,
        questionnaireVersion: { include: { questionnaire: true } },
        evaluator: true,
      },
    });

    return { assessment, domainScores, finalConclusion };
  }

  private async callParseServiceWithFileData(
    pages: OcrPage[],
    questionIds: string[],
    fileData: string,
    fileName?: string,
  ): Promise<Record<string, string>> {
    this.logger.debug(`Calling parse service with ${pages.length} pages, ${questionIds.length} questions, file_data: ${fileData.length} chars`);
    
    const requestBody: any = {
      pages,
      question_ids: questionIds,
      file_data: fileData,
      file_name: fileName,
    };
    
    return this.sendParseRequest(requestBody);
  }

  private async callParseService(
    pages: OcrPage[],
    questionIds: string[],
    fileId?: number,
  ): Promise<Record<string, string>> {
    this.logger.debug(`Calling parse service with ${pages.length} pages, ${questionIds.length} questions`);
    
    const requestBody: any = {
      pages,
      question_ids: questionIds,
    };

    if (fileId) {
      const file = await this.prisma.file.findUnique({ where: { id: fileId } });
      if (file) {
        if (fs.existsSync(file.storagePath)) {
          const fileData = fs.readFileSync(file.storagePath);
          requestBody.file_data = fileData.toString('base64');
          requestBody.file_name = file.originalName;
          this.logger.debug(`Including file_data: ${file.originalName}, ${fileData.length} bytes (base64: ${requestBody.file_data.length} chars)`);
        } else {
          this.logger.warn(`File path doesn't exist: fileId=${fileId}, path=${file.storagePath}. Trying to use file_data from OCR result...`);
        }
      } else {
        this.logger.warn(`File not found in DB: fileId=${fileId}`);
      }
    } else {
      this.logger.warn('No fileId provided to callParseService');
    }
    
    return this.sendParseRequest(requestBody);
  }

  private async sendParseRequest(requestBody: any): Promise<Record<string, string>> {
    
    const response = await fetch(`${this.ocrServiceUrl}/parse`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      this.logger.error(`Parse service error (${response.status}): ${errorText}`);
      throw new BadGatewayException(`Parse service error: ${errorText}`);
    }

    const result = (await response.json()) as { answers: Record<string, string> };
    const answerCount = Object.keys(result.answers || {}).length;
    this.logger.debug(`Parse service returned ${answerCount} answers`);
    
    return result.answers || {};
  }

  private async callOcrService(
    tmpPath: string,
    file: Express.Multer.File,
  ): Promise<OcrResponse> {
    const form = new FormData();
    form.append('file', fs.createReadStream(tmpPath), {
      filename: file.originalname,
      contentType: file.mimetype,
    });

    const response = await fetch(`${this.ocrServiceUrl}/recognize`, {
      method: 'POST',
      headers: form.getHeaders(),
      body: form,
      timeout: 300000, 
    } as any);

    if (!response.ok) {
      const errorText = await response.text();
      this.logger.error(`OCR service error (${response.status}): ${errorText}`);
      let errorMessage = `OCR service error: ${errorText}`;
      try {
        const errorJson = JSON.parse(errorText);
        errorMessage = errorJson.detail || errorJson.message || errorText;
      } catch {
      }
      throw new BadGatewayException(errorMessage);
    }

    return (await response.json()) as OcrResponse;
  }

  private async saveFile(file: Express.Multer.File, tmpPath: string) {
    return this.prisma.file.create({
      data: {
        originalName: file.originalname,
        storagePath: tmpPath,
        mimeType: file.mimetype,
        sizeBytes: file.size,
      },
    });
  }

  private async saveOcrResult(
    fileId: number,
    questionnaireVersionId: number | undefined,
    result: OcrResponse,
  ) {
    return this.prisma.ocrResult.create({
      data: {
        fileId,
        questionnaireVersionId: questionnaireVersionId || null,
        rawText: result.full_text,
        confidence: result.confidence,
        bboxJson: result.pages as any,
      },
    });
  }

  private extractQuestionIds(structure: any): string[] {
    const questionIds: string[] = [];
    
    for (const domain of structure.domains || []) {
      for (const q of domain.questions || []) {
        questionIds.push(q.id);
      }
    }
    
    if (structure.overall_section && Array.isArray(structure.overall_section)) {
      for (const q of structure.overall_section) {
        if (q.id) {
          questionIds.push(q.id);
        }
      }
    }
    
    return questionIds;
  }

  private parseAnswersFromText(
    fullText: string,
    questionIds: string[],
    pages?: OcrPage[],
    structure?: any,
  ): Record<string, string> {
    this.logger.warn('Fallback parsing: returning empty answers');
    return {};
  }

  private extractQuestionNumber(qId: string): string | null {
    const match = qId.match(/(\d+)$/);
    return match ? match[1] : null;
  }

  private calculateDomainScores(
    structure: any,
    answers: Record<string, string>,
  ): Record<string, number> {
    const scoreValues = structure.rules?.score_values || { Y: 10, S: 5, N: 0 };
    const domainTotals: Record<string, number> = {};

    for (const domain of structure.domains || []) {
      let total = 0;
      for (const q of domain.questions || []) {
        const answer = answers[q.id];
        if (answer && scoreValues[answer] !== undefined) {
          total += scoreValues[answer];
        }
      }
      domainTotals[domain.key] = total;
    }

    return domainTotals;
  }

  private classifyResults(
    structure: any,
    domainTotals: Record<string, number>,
  ) {
    const monitorMargin = structure.rules?.monitor_margin || 2;
    const domainScores: Record<string, any> = {};
    const domainConclusions: Record<string, string> = {};

    for (const domain of structure.domains || []) {
      const total = domainTotals[domain.key] || 0;
      const cutoff = domain.cutoff_score;

      let conclusion = 'NORMAL';
      if (total < cutoff - monitorMargin) {
        conclusion = 'REFER';
      } else if (total < cutoff) {
        conclusion = 'MONITOR';
      }

      domainScores[domain.key] = { total, cutoff, conclusion };
      domainConclusions[domain.key] = conclusion;
    }

    const hasRefer = Object.values(domainConclusions).includes('REFER');
    const hasMonitor = Object.values(domainConclusions).includes('MONITOR');
    const finalConclusion = hasRefer
      ? 'REFER'
      : hasMonitor
        ? 'MONITOR'
        : 'NORMAL';

    return { domainScores, finalConclusion };
  }
}

