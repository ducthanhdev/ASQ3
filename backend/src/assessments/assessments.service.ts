import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAssessmentDto } from './dto/create-assessment.dto';
import { UpdateAssessmentDto } from './dto/update-assessment.dto';
import { SubmitOnlineAssessmentDto } from './dto/submit-online-assessment.dto';

@Injectable()
export class AssessmentsService {
  constructor(private prisma: PrismaService) {}

  findAll() {
    return this.prisma.assessment.findMany({
      include: {
        child: { select: { id: true, fullName: true } },
        questionnaireVersion: { select: { id: true, version: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  findByParent(parentId: number) {
    return this.prisma.assessment.findMany({
      where: { child: { parentId } },
      include: {
        child: { select: { id: true, fullName: true } },
        questionnaireVersion: { select: { id: true, version: true } },
        evaluator: { select: { id: true, username: true } },
        reviewedBy: { select: { id: true, username: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async create(dto: CreateAssessmentDto, user: any) {
    const child = await this.prisma.child.findUnique({
      where: { id: dto.childId },
    });
    if (!child) throw new NotFoundException('Child not found');

    if (user.role === 'PARENT' && child.parentId !== user.userId) {
      throw new ForbiddenException();
    }

    const version = await this.prisma.questionnaireVersion.findUnique({
      where: { id: dto.questionnaireVersionId },
    });
    if (!version) {
      throw new NotFoundException('Questionnaire version not found');
    }

    const structure = version.structureJson as any;
    const domainTotals = this.calculateDomainScores(structure, dto.answers);

    return this.prisma.assessment.create({
      data: {
        childId: dto.childId,
        questionnaireVersionId: dto.questionnaireVersionId,
        evaluatorId: user.userId,
        assessmentDate: new Date(),
        answersJson: dto.answers,
        summaryResultJson: {
          domainTotals,
          finalConclusion: 'PENDING_REVIEW',
        },
      },
    });
  }

  async getOne(id: number, user: any) {
    const assessment = await this.prisma.assessment.findUnique({
      where: { id },
      include: {
        child: true,
        questionnaireVersion: {
          include: { questionnaire: true },
        },
      },
    });

    if (!assessment) throw new NotFoundException();

    if (user.role === 'PARENT' && assessment.child.parentId !== user.userId) {
      throw new ForbiddenException();
    }

    return assessment;
  }

  async review(id: number, dto: any, user: any) {
    if (user.role !== 'SPECIALIST' && user.role !== 'ADMIN') {
      throw new ForbiddenException(
        'Only specialists and admins can review assessments',
      );
    }

    const assessment = await this.prisma.assessment.findUnique({
      where: { id },
    });
    if (!assessment) throw new NotFoundException();

    return this.prisma.assessment.update({
      where: { id },
      data: {
        status: dto.status,
        reviewedById: user.userId,
        reviewedAt: new Date(),
      },
      include: {
        child: true,
        questionnaireVersion: {
          include: { questionnaire: true },
        },
        evaluator: true,
        reviewedBy: true,
      },
    });
  }

  update(id: number, dto: UpdateAssessmentDto) {
    return this.prisma.assessment.update({
      where: { id },
      data: dto,
    });
  }

  remove(id: number) {
    return this.prisma.assessment.delete({ where: { id } });
  }

  async submitOnline(dto: SubmitOnlineAssessmentDto, user: any) {
    const child = await this.prisma.child.findUnique({
      where: { id: dto.childId },
    });
    if (!child) throw new NotFoundException('Child not found');

    if (user.role === 'PARENT' && child.parentId !== user.userId) {
      throw new ForbiddenException('Not your child');
    }

    const version = await this.prisma.questionnaireVersion.findUnique({
      where: { id: dto.questionnaireVersionId },
      include: { questionnaire: true },
    });
    if (!version) {
      throw new NotFoundException('Questionnaire version not found');
    }

    const structure = version.structureJson as any;
    const domainTotals = this.calculateDomainScores(structure, dto.answers);
    const { domainScores, finalConclusion } = this.classifyResults(
      structure,
      domainTotals,
    );

    const status = user.role === 'PARENT' ? 'PENDING_REVIEW' : 'APPROVED';
    const reviewedById =
      user.role === 'SPECIALIST' || user.role === 'ADMIN' ? user.userId : null;
    const reviewedAt = reviewedById ? new Date() : null;

    const assessment = await this.prisma.assessment.create({
      data: {
        childId: dto.childId,
        questionnaireVersionId: dto.questionnaireVersionId,
        evaluatorId: user.userId,
        assessmentDate: new Date(),
        completionDate: new Date(),
        answersJson: dto.answers,
        scoresJson: domainScores,
        summaryResultJson: {
          domainScores,
          finalConclusion,
        },
        finalConclusion,
        status,
        reviewedById,
        reviewedAt,
        method: 'ONLINE',
        evaluatorFirstName: dto.evaluatorFirstName || undefined,
        evaluatorMiddleName: dto.evaluatorMiddleName || undefined,
        evaluatorLastName: dto.evaluatorLastName || undefined,
        relationship: this.normalizeOptionalString(dto.relationship) as any,
        evaluatorAddress: dto.evaluatorAddress || undefined,
        evaluatorHomePhone: dto.evaluatorHomePhone || undefined,
        evaluatorOtherPhone: dto.evaluatorOtherPhone || undefined,
        evaluatorEmail: this.normalizeOptionalString(dto.evaluatorEmail),
        helperName: dto.helperName || undefined,
        programRegistrationNumber: dto.programRegistrationNumber || undefined,
        programName: dto.programName || undefined,
      },
      include: {
        child: true,
        questionnaireVersion: {
          include: { questionnaire: true },
        },
        evaluator: true,
        reviewedBy: true,
      },
    });

    return {
      assessment,
      domainScores,
      finalConclusion,
    };
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

  private normalizeOptionalString(value?: string): string | undefined {
    return value && value !== '' ? value : undefined;
  }
}
