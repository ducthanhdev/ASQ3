import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateQuestionnaireDto } from './dto/create-questionnaire.dto';
import { UpdateQuestionnaireDto } from './dto/update-questionnaire.dto';

@Injectable()
export class QuestionnaireService {
  constructor(private prisma: PrismaService) {}

  findAll() {
    return this.prisma.questionnaire.findMany({
      include: {
        versions: {
          orderBy: { id: 'desc' },
          take: 1,
        },
      },
    });
  }

  async findOne(id: number) {
    const questionnaire = await this.prisma.questionnaire.findUnique({
      where: { id },
      include: { versions: { orderBy: { id: 'desc' } } },
    });

    if (!questionnaire) throw new NotFoundException();
    return questionnaire;
  }

  async getLatestVersion(id: number) {
    const questionnaire = await this.prisma.questionnaire.findUnique({
      where: { id },
    });
    if (!questionnaire) throw new NotFoundException();

    const version = await this.prisma.questionnaireVersion.findFirst({
      where: { questionnaireId: id },
      orderBy: { id: 'desc' },
    });
    if (!version) throw new NotFoundException();

    return version;
  }

  create(dto: CreateQuestionnaireDto) {
    return this.prisma.questionnaire.create({ data: dto });
  }

  update(id: number, dto: UpdateQuestionnaireDto) {
    return this.prisma.questionnaire.update({
      where: { id },
      data: dto,
    });
  }

  remove(id: number) {
    return this.prisma.questionnaire.delete({ where: { id } });
  }
}


