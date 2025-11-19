import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class QuestionnaireService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.questionnaire.findMany({
      include: {
        versions: {
          orderBy: {
            createdAt: 'desc',
          },
          take: 1,
        },
      },
    });
  }

  async getLatestVersion(id: number) {
    return this.prisma.questionnaireVersion.findFirst({
      where: { questionnaireId: id },
      orderBy: { createdAt: 'desc' },
    });
  }
}

