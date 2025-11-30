import {
  Injectable,
  Logger,
  NotFoundException,
  BadGatewayException,
  BadRequestException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import fetch from 'node-fetch';
import FormData from 'form-data';

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
  image?: string;
}

export interface OcrResponse {
  status: string;
  pages: OcrPage[];
  full_text: string;
  confidence: number;
  total_frames: number;
}

export interface OcrResponseWithIds extends OcrResponse {
  ocrResultId: number;
  fileId: number;
}

interface ParseResponse {
  answers: Record<string, string>;
}

interface QuestionnaireStructure {
  domains?: Array<{
    key: string;
    cutoff_score: number;
    questions: Array<{ id: string }>;
  }>;
  overall_section?: Array<{ id: string }>;
  rules?: {
    score_values?: Record<string, number>;
    monitor_margin?: number;
  };
}

@Injectable()
export class OcrService {
  private readonly logger = new Logger(OcrService.name);
  private readonly ocrServiceUrl: string;
  private readonly requestTimeout = 600000;

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
  ) {
    this.ocrServiceUrl =
      this.configService.get<string>('OCR_SERVICE_URL') || 'http://localhost:8000';
  }

  async recognizeFile(
    file: Express.Multer.File,
    questionnaireVersionId?: number,
    childId?: number,
  ): Promise<OcrResponseWithIds> {
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    if (childId) {
      const child = await this.prisma.child.findUnique({ where: { id: childId } });
      if (!child) {
        throw new NotFoundException(`Child with ID ${childId} not found`);
      }
    }

    const savedFile = await this.saveFileToDb(file, childId);

    try {
      const ocrResult = await this.callOcrRecognize(file);
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
      await this.prisma.file.delete({ where: { id: savedFile.id } }).catch(() => {});
      throw error;
    }
  }

  async createAssessmentFromOcr(
    ocrResultId: number,
    childId: number,
    questionnaireVersionId: number,
    userId: number,
  ) {
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

    const structure = version.structureJson as QuestionnaireStructure;
    const answers = await this.getOrParseAnswers(ocrResult, structure, questionnaireVersionId);
    const { domainScores, finalConclusion } = this.calculateScores(structure, answers);

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

  private async getOrParseAnswers(
    ocrResult: any,
    structure: QuestionnaireStructure,
    questionnaireVersionId: number,
  ): Promise<Record<string, string>> {
    const parsedAnswers = ocrResult.parsedAnswersJson as Record<string, string> | null;

    if (parsedAnswers && Object.keys(parsedAnswers).length > 0) {
      return parsedAnswers;
    }

    try {
      const questionIds = this.extractQuestionIds(structure);
      const relatedIds = await this.findRelatedOcrResultIds(
        ocrResult.id,
        questionnaireVersionId,
      );
      const allIds = [ocrResult.id, ...relatedIds];

      const answers = await this.parseOcrResults(allIds, questionIds);

      await this.prisma.ocrResult.update({
        where: { id: ocrResult.id },
        data: { parsedAnswersJson: answers, questionnaireVersionId },
      });

      return answers;
    } catch (error) {
      this.logger.warn(`Auto-parse failed: ${error.message}`);
      return {};
    }
  }

  private async findRelatedOcrResultIds(
    ocrResultId: number,
    questionnaireVersionId: number,
  ): Promise<number[]> {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const results = await this.prisma.ocrResult.findMany({
      where: {
        questionnaireVersionId,
        id: { not: ocrResultId },
        createdAt: { gte: oneHourAgo },
      },
      orderBy: { createdAt: 'asc' },
      take: 10,
      select: { id: true },
    });

    return results.map((r) => r.id);
  }

  private async parseOcrResults(
    ocrResultIds: number[],
    questionIds: string[],
  ): Promise<Record<string, string>> {
    const ocrResults = await Promise.all(
      ocrResultIds.map((id) =>
        this.prisma.ocrResult.findUnique({
          where: { id },
          include: { file: true },
        }),
      ),
    );

    const validResults = ocrResults.filter((r) => r !== null);
    if (validResults.length === 0) {
      throw new NotFoundException('No valid OCR results found');
    }

    const files = await Promise.all(
      validResults.map((r) =>
        r.fileId
          ? this.prisma.file.findUnique({
              where: { id: r.fileId },
              select: { id: true, originalName: true, fileData: true },
            })
          : null,
      ),
    );

    const pages = this.collectPages(validResults, files);
    const requestBody = this.buildParseRequest(pages, questionIds, files);

    const response = await fetch(`${this.ocrServiceUrl}/parse`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      this.logger.error(`Parse service error (${response.status}): ${errorText}`);
      throw new BadGatewayException(`Parse service error: ${errorText}`);
    }

    const result = (await response.json()) as ParseResponse;
    return result.answers || {};
  }

  private collectPages(ocrResults: any[], files: any[]): any[] {
    const allPages: any[] = [];
    let pageIndexOffset = 0;

    for (let i = 0; i < ocrResults.length; i++) {
      const ocrResult = ocrResults[i];
      const file = files[i];

      if (!ocrResult.bboxJson) continue;

      const pages = ocrResult.bboxJson as unknown as OcrPage[];
      const fileImageBase64 = file?.fileData
        ? Buffer.from(file.fileData as Buffer).toString('base64')
        : null;

      const mappedPages = pages.map((page, pageIdx) => ({
        frame_index: page.frame_index + pageIndexOffset,
        width: page.width,
        height: page.height,
        texts: page.texts,
        question_numbers: page.question_numbers || [],
        ...(pageIdx === 0 && fileImageBase64 && { image: fileImageBase64 }),
      }));

      allPages.push(...mappedPages);
      pageIndexOffset += pages.length;
    }

    return allPages;
  }

  private buildParseRequest(
    pages: any[],
    questionIds: string[],
    files: any[],
  ): any {
    const requestBody: any = {
      pages,
      question_ids: questionIds,
    };

    if (files.length === 1 && files[0]?.fileData) {
      requestBody.file_data = Buffer.from(files[0].fileData as Buffer).toString('base64');
      requestBody.file_name = files[0].originalName;
    }

    return requestBody;
  }

  private extractQuestionIds(structure: QuestionnaireStructure): string[] {
    const questionIds: string[] = [];

    for (const domain of structure.domains || []) {
      for (const q of domain.questions || []) {
        questionIds.push(q.id);
      }
    }

    for (const q of structure.overall_section || []) {
      if (q.id) questionIds.push(q.id);
    }

    return questionIds;
  }

  private calculateScores(
    structure: QuestionnaireStructure,
    answers: Record<string, string>,
  ) {
    const domainTotals = this.calculateDomainTotals(structure, answers);
    return this.classifyResults(structure, domainTotals);
  }

  private calculateDomainTotals(
    structure: QuestionnaireStructure,
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
    structure: QuestionnaireStructure,
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
    const finalConclusion = hasRefer ? 'REFER' : hasMonitor ? 'MONITOR' : 'NORMAL';

    return { domainScores, finalConclusion };
  }

  private async callOcrRecognize(file: Express.Multer.File): Promise<OcrResponse> {
    const form = new FormData();
    form.append('file', file.buffer, {
      filename: file.originalname,
      contentType: file.mimetype,
    });

    const response = await fetch(`${this.ocrServiceUrl}/recognize`, {
      method: 'POST',
      headers: form.getHeaders(),
      body: form,
      timeout: this.requestTimeout,
      signal: AbortSignal.timeout(this.requestTimeout),
    } as any);

    if (!response.ok) {
      const errorText = await response.text();
      this.logger.error(`OCR service error (${response.status}): ${errorText}`);
      let errorMessage = errorText;
      try {
        const errorJson = JSON.parse(errorText);
        errorMessage = errorJson.detail || errorJson.message || errorText;
      } catch {
        // Keep original errorText
      }
      throw new BadGatewayException(errorMessage);
    }

    return (await response.json()) as OcrResponse;
  }

  private async saveFileToDb(file: Express.Multer.File, childId?: number) {
    return this.prisma.file.create({
      data: {
        originalName: file.originalname,
        fileData: Buffer.from(file.buffer),
        mimeType: file.mimetype,
        sizeBytes: file.size,
        ...(childId && { childId }),
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
}
