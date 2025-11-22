import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAssessmentDto } from './dto/create-assessment.dto';
import { UpdateAssessmentDto } from './dto/update-assessment.dto';
import { SubmitOnlineAssessmentDto } from './dto/submit-online-assessment.dto';
import { computeAdjustedAge } from '../common/utils/age.util';

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
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async create(dto: CreateAssessmentDto, user: any) {
    const { childId, questionnaireVersionId, answers } = dto;

    const child = await this.prisma.child.findUnique({ where: { id: childId } });
    if (!child) throw new NotFoundException('Child not found');

    if (user.role === 'PARENT' && child.parentId !== user.userId) {
      throw new ForbiddenException();
    }

    const version = await this.prisma.questionnaireVersion.findUnique({
      where: { id: questionnaireVersionId },
    });
    if (!version) throw new NotFoundException('Questionnaire version not found');

    const structure = version.structureJson as any;
    const scoreMap = { Y: 10, S: 5, N: 0 };
    const domainTotals = {};

    for (const domain of structure.domains || []) {
      let total = 0;
      for (const q of domain.questions || []) {
        const ans = answers[q.id];
        total += ans ? scoreMap[ans] : 0;
      }
      domainTotals[domain.key] = total;
    }

    return this.prisma.assessment.create({
      data: {
        childId,
        questionnaireVersionId,
        evaluatorId: user.userId,
        assessmentDate: new Date(),
        answersJson: answers,
        summaryResultJson: { domainTotals, finalConclusion: 'PENDING_REVIEW' },
      },
    });
  }

  async getOne(id: number, user: any) {
    const assessment = await this.prisma.assessment.findUnique({
      where: { id },
      include: { child: true },
    });
    if (!assessment) throw new NotFoundException();

    if (user.role === 'PARENT' && assessment.child.parentId !== user.userId) {
      throw new ForbiddenException();
    }

    return assessment;
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
      include: {
        questionnaire: true,
      },
    });
    if (!version) throw new NotFoundException('Questionnaire version not found');

    const structure = version.structureJson as any;
    const scoreValues = structure.rules?.score_values || { Y: 10, S: 5, N: 0 };
    const monitorMargin = structure.rules?.monitor_margin || 2;

    const domainScores = {};
    const domainConclusions = {};

    for (const domain of structure.domains || []) {
      let total = 0;
      for (const q of domain.questions || []) {
        const answer = dto.answers[q.id];
        if (answer && scoreValues[answer] !== undefined) {
          total += scoreValues[answer];
        }
      }

      const cutoff = domain.cutoff_score;
      let conclusion = 'NORMAL';
      if (total < cutoff - monitorMargin) {
        conclusion = 'REFER';
      } else if (total < cutoff) {
        conclusion = 'MONITOR';
      }

      domainScores[domain.key] = {
        total,
        cutoff,
        conclusion,
      };
      domainConclusions[domain.key] = conclusion;
    }

    const hasRefer = Object.values(domainConclusions).includes('REFER');
    const hasMonitor = Object.values(domainConclusions).includes('MONITOR');
    const finalConclusion = hasRefer ? 'REFER' : hasMonitor ? 'MONITOR' : 'NORMAL';

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
        method: 'ONLINE',
        evaluatorFirstName: dto.evaluatorFirstName || undefined,
        evaluatorMiddleName: dto.evaluatorMiddleName || undefined,
        evaluatorLastName: dto.evaluatorLastName || undefined,
        relationship: dto.relationship && dto.relationship !== '' ? (dto.relationship as any) : undefined,
        evaluatorAddress: dto.evaluatorAddress || undefined,
        evaluatorHomePhone: dto.evaluatorHomePhone || undefined,
        evaluatorOtherPhone: dto.evaluatorOtherPhone || undefined,
        evaluatorEmail: dto.evaluatorEmail && dto.evaluatorEmail !== '' ? dto.evaluatorEmail : undefined,
        helperName: dto.helperName || undefined,
        programRegistrationNumber: dto.programRegistrationNumber || undefined,
        programName: dto.programName || undefined,
      },
      include: {
        child: true,
        questionnaireVersion: {
          include: {
            questionnaire: true,
          },
        },
      },
    });

    return {
      assessment,
      domainScores,
      finalConclusion,
    };
  }
}
