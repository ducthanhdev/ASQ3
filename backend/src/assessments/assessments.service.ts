import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAssessmentDto } from './dto/create-assessment.dto';

@Injectable()
export class AssessmentsService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateAssessmentDto) {
    const { childId, questionnaireVersionId, answers } = dto;

    const version = await this.prisma.questionnaireVersion.findUnique({
      where: { id: questionnaireVersionId },
    });

    if (!version) {
      throw new Error('Questionnaire version not found');
    }

    const structure = version.structureJson as any;

    const scoreMap = { Y: 10, S: 5, N: 0 };

    let domainTotals = {};

    for (const domain of structure.domains || []) {
      let total = 0;

      for (const q of domain.questions || []) {
        const ans = answers[q.id];
        total += ans ? scoreMap[ans] : 0;
      }

      domainTotals[domain.key] = total;
    }

    const summary = {
      domainTotals,
      finalConclusion: 'PENDING_REVIEW',
    };
        
    const assessment = await this.prisma.assessment.create({
      data: {
        childId,
        questionnaireVersionId,
        assessmentDate: new Date(),
        answersJson: answers,
        summaryResultJson: summary,
      },
    });

    return assessment;
  }

  async getOne(id: number) {
    return this.prisma.assessment.findUnique({
      where: { id },
    });
  }
}
