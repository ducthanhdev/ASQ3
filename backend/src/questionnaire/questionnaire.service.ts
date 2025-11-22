import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateQuestionnaireDto } from './dto/create-questionnaire.dto';
import { UpdateQuestionnaireDto } from './dto/update-questionnaire.dto';
import { CreateManualQuestionnaireDto } from './dto/create-manual-questionnaire.dto';
import { ImportJsonQuestionnaireDto } from './dto/import-json-questionnaire.dto';
import { CreateVersionDto } from './dto/create-version.dto';
import { computeAdjustedAge } from '../common/utils/age.util';

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

  async getVersions(id: number) {
    const questionnaire = await this.prisma.questionnaire.findUnique({
      where: { id },
    });
    if (!questionnaire) throw new NotFoundException();

    return this.prisma.questionnaireVersion.findMany({
      where: { questionnaireId: id },
      orderBy: { id: 'desc' },
    });
  }

  create(dto: CreateQuestionnaireDto) {
    return this.prisma.questionnaire.create({ data: dto });
  }

  async createManual(dto: CreateManualQuestionnaireDto) {
    if (dto.domains.length !== 5) {
      throw new BadRequestException('Must have exactly 5 domains');
    }

    for (const domain of dto.domains) {
      if (domain.questions.length !== 6) {
        throw new BadRequestException(`Domain ${domain.title} must have exactly 6 questions`);
      }
    }

    const structure = this.buildStructureFromManual(dto);

    const questionnaire = await this.prisma.questionnaire.create({
      data: {
        code: dto.code,
        title: dto.title,
        minMonth: dto.minMonth,
        maxMonth: dto.maxMonth,
        language: dto.language,
      },
    });

    const version = await this.prisma.questionnaireVersion.create({
      data: {
        questionnaireId: questionnaire.id,
        version: dto.version,
        structureJson: structure,
      },
    });

    return { questionnaire, version };
  }

  async importJson(dto: ImportJsonQuestionnaireDto) {
    this.validateStructure(dto.structure);

    const questionnaire = await this.prisma.questionnaire.create({
      data: {
        code: dto.code,
        title: dto.title,
        minMonth: dto.minMonth,
        maxMonth: dto.maxMonth,
        language: dto.language,
      },
    });

    const version = await this.prisma.questionnaireVersion.create({
      data: {
        questionnaireId: questionnaire.id,
        version: dto.version,
        structureJson: dto.structure,
      },
    });

    return { questionnaire, version };
  }

  async createVersion(id: number, dto: CreateVersionDto) {
    const questionnaire = await this.prisma.questionnaire.findUnique({
      where: { id },
    });
    if (!questionnaire) throw new NotFoundException();

    this.validateStructure(dto.structure);

    const version = await this.prisma.questionnaireVersion.create({
      data: {
        questionnaireId: id,
        version: dto.version,
        structureJson: dto.structure,
      },
    });

    return version;
  }

  update(id: number, dto: UpdateQuestionnaireDto) {
    return this.prisma.questionnaire.update({
      where: { id },
      data: dto,
    });
  }

  async remove(id: number) {
    const versions = await this.prisma.questionnaireVersion.findMany({
      where: { questionnaireId: id },
      include: {
        assessments: { take: 1 },
        ocrResults: { take: 1 },
      },
    });

    const hasAssessments = versions.some(v => v.assessments.length > 0);
    const hasOcrResults = versions.some(v => v.ocrResults.length > 0);

    if (hasAssessments || hasOcrResults) {
      throw new BadRequestException(
        'Cannot delete questionnaire that has been used in assessments or OCR results'
      );
    }

    await this.prisma.questionnaireVersion.deleteMany({
      where: { questionnaireId: id },
    });

    await this.prisma.ocrTemplate.deleteMany({
      where: { questionnaireId: id },
    });

    return this.prisma.questionnaire.delete({ where: { id } });
  }

  async autoSelect(childId: number) {
    const child = await this.prisma.child.findUnique({
      where: { id: childId },
    });
    if (!child) throw new NotFoundException('Child not found');

    const ageMonths = computeAdjustedAge(
      child.birthDate,
      new Date(),
      child.prematureWeeks,
    );

    const questionnaire = await this.prisma.questionnaire.findFirst({
      where: {
        minMonth: { lte: ageMonths },
        maxMonth: { gte: ageMonths },
      },
      include: {
        versions: {
          orderBy: { id: 'desc' },
          take: 1,
        },
      },
    });

    if (!questionnaire || !questionnaire.versions[0]) {
      throw new NotFoundException(
        `No questionnaire found for age ${ageMonths} months`,
      );
    }

    return {
      child: {
        id: child.id,
        fullName: child.fullName,
        ageMonths,
        birthDate: child.birthDate,
      },
      questionnaire,
      version: questionnaire.versions[0],
    };
  }

  private buildStructureFromManual(dto: CreateManualQuestionnaireDto) {
    const domains = dto.domains.map((domain, domainIdx) => {
      const domainKey = domain.key.toLowerCase().replace(/\s+/g, '_');
      return {
        key: domainKey,
        title: domain.title,
        cutoff_score: domain.cutoffScore,
        questions: domain.questions.map((q, qIdx) => ({
          id: `${domainKey}_q${qIdx + 1}`,
          text: q.text,
          sort_order: qIdx + 1,
        })),
      };
    });

    const overallSection = dto.overallQuestions.map((q, idx) => ({
      id: `overall_q${idx + 1}`,
      text: q.text,
      type: 'yes_no_explain',
    }));

    const rules = dto.rules || {
      score_values: { Y: 10, S: 5, N: 0 },
      monitor_margin: 2,
    };

    return {
      metadata: {
        code: dto.code,
        title: dto.title,
        min_month: dto.minMonth,
        max_month: dto.maxMonth,
        language: dto.language,
        version: dto.version,
      },
      domains,
      overall_section: overallSection,
      rules,
    };
  }

  private validateStructure(structure: any) {
    if (!structure.domains || !Array.isArray(structure.domains)) {
      throw new BadRequestException('Structure must have domains array');
    }

    if (structure.domains.length !== 5) {
      throw new BadRequestException('Must have exactly 5 domains');
    }

    for (const domain of structure.domains) {
      if (!domain.key || !domain.title || domain.cutoff_score === undefined) {
        throw new BadRequestException(`Domain missing required fields: key, title, cutoff_score`);
      }

      if (!domain.questions || !Array.isArray(domain.questions)) {
        throw new BadRequestException(`Domain ${domain.title} must have questions array`);
      }

      if (domain.questions.length !== 6) {
        throw new BadRequestException(`Domain ${domain.title} must have exactly 6 questions`);
      }

      for (const q of domain.questions) {
        if (!q.id || !q.text || q.sort_order === undefined) {
          throw new BadRequestException(`Question missing required fields: id, text, sort_order`);
        }
      }
    }

    if (!structure.rules || !structure.rules.score_values) {
      throw new BadRequestException('Structure must have rules.score_values');
    }

    const scoreValues = structure.rules.score_values;
    if (scoreValues.Y === undefined || scoreValues.S === undefined || scoreValues.N === undefined) {
      throw new BadRequestException('score_values must have Y, S, N keys');
    }

    if (typeof structure.rules.monitor_margin !== 'number') {
      throw new BadRequestException('monitor_margin must be a number');
    }

    const questionIds = new Set();
    for (const domain of structure.domains) {
      for (const q of domain.questions) {
        if (questionIds.has(q.id)) {
          throw new BadRequestException(`Duplicate question ID: ${q.id}`);
        }
        questionIds.add(q.id);
      }
    }
  }
}


