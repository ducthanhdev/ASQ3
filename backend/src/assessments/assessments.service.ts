import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAssessmentDto } from './dto/create-assessment.dto';
import { UpdateAssessmentDto } from './dto/update-assessment.dto';

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
}
