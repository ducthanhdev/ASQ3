import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class QuestionnaireService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.questionnaire.findMany({
      include: {
        versions: {
          orderBy: {
            id: 'desc',
          },
          take: 1,
        },
      },
    });
  }

  async findOne(id: number) {
    const questionnaire = await this.prisma.questionnaire.findUnique({
      where: { id },
      include: {
        versions: {
          orderBy: {
            id: 'desc',
          },
        },
      },
    });

    if (!questionnaire) {
      throw new NotFoundException(`Questionnaire with ID ${id} not found`);
    }

    return questionnaire;
  }

  async getLatestVersion(id: number) {
    const questionnaire = await this.prisma.questionnaire.findUnique({
      where: { id },
    });

    if (!questionnaire) {
      throw new NotFoundException(`Questionnaire with ID ${id} not found`);
    }

    const version = await this.prisma.questionnaireVersion.findFirst({
      where: { questionnaireId: id },
      orderBy: { id: 'desc' },
    });

    if (!version) {
      throw new NotFoundException(
        `No version found for questionnaire with ID ${id}`,
      );
    }

    return version;
  }
}

