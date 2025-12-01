import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateQuestionnaireDto } from './dto/create-questionnaire.dto';
import { UpdateQuestionnaireDto } from './dto/update-questionnaire.dto';
import { CreateManualQuestionnaireDto } from './dto/create-manual-questionnaire.dto';
import { ImportJsonQuestionnaireDto } from './dto/import-json-questionnaire.dto';
import { CreateVersionDto } from './dto/create-version.dto';
import { computeAdjustedAge, computeAdjustedAgeWithDays } from '../common/utils/age.util';

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

  async getVersionById(id: number) {
    const version = await this.prisma.questionnaireVersion.findUnique({
      where: { id },
      include: { questionnaire: true },
    });
    if (!version) throw new NotFoundException();

    return {
      questionnaire: version.questionnaire,
      version: version.version,
      structure: version.structureJson,
    };
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
    this.validateDomainsCount(dto.domains);

    const structure = this.buildStructureFromManual(dto);
    const questionnaire = await this.createQuestionnaire(dto);
    const version = await this.createVersionRecord(questionnaire.id, dto.version, structure);

    return { questionnaire, version };
  }

  async importJson(dto: ImportJsonQuestionnaireDto) {
    this.validateStructure(dto.structure);

    const questionnaire = await this.createQuestionnaire(dto);
    const version = await this.createVersionRecord(questionnaire.id, dto.version, dto.structure);

    return { questionnaire, version };
  }

  async createVersion(id: number, dto: CreateVersionDto) {
    const questionnaire = await this.prisma.questionnaire.findUnique({
      where: { id },
    });
    if (!questionnaire) throw new NotFoundException();

    this.validateStructure(dto.structure);

    return this.prisma.questionnaireVersion.create({
      data: {
        questionnaireId: id,
        version: dto.version,
        structureJson: dto.structure,
      },
    });
  }

  update(id: number, dto: UpdateQuestionnaireDto) {
    return this.prisma.questionnaire.update({
      where: { id },
      data: dto,
    });
  }

  async removeVersion(versionId: number) {
    const version = await this.prisma.questionnaireVersion.findUnique({
      where: { id: versionId },
      include: {
        assessments: { take: 1 },
        ocrResults: { take: 1 },
      },
    });

    if (!version) {
      throw new NotFoundException('Questionnaire version not found');
    }

    if (version.assessments.length > 0) {
      throw new BadRequestException(
        'Cannot delete version that has been used in assessments',
      );
    }

    if (version.ocrResults.length > 0) {
      throw new BadRequestException(
        'Cannot delete version that has been used in OCR results',
      );
    }

    return this.prisma.questionnaireVersion.delete({
      where: { id: versionId },
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

    const hasAssessments = versions.some((v) => v.assessments.length > 0);
    const hasOcrResults = versions.some((v) => v.ocrResults.length > 0);

    if (hasAssessments || hasOcrResults) {
      throw new BadRequestException(
        'Cannot delete questionnaire that has been used in assessments or OCR results',
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

    const { months: ageMonths, days: ageDays } = computeAdjustedAgeWithDays(
      child.birthDate,
      new Date(),
      child.prematureWeeks,
    );

    const allQuestionnaires = await this.prisma.questionnaire.findMany({
      include: {
        versions: {
          orderBy: { id: 'desc' },
          take: 1,
        },
      },
    });

    const matchingQuestionnaires = allQuestionnaires.filter((q) => {
      const minDay = q.minDay ?? 0;
      const maxDay = q.maxDay ?? 0;

      const minTotalDays = q.minMonth * 30 + minDay;
      const maxTotalDays = q.maxMonth * 30 + maxDay;
      const childTotalDays = ageMonths * 30 + ageDays;

      return childTotalDays >= minTotalDays && childTotalDays <= maxTotalDays;
    });

    const questionnaire = matchingQuestionnaires.find(
      (q) => q.versions && q.versions.length > 0,
    );

    if (!questionnaire || !questionnaire.versions[0]) {
      throw new NotFoundException(
        `No questionnaire found for age ${ageMonths} months ${ageDays} days`,
      );
    }

    return {
      child: {
        id: child.id,
        fullName: child.fullName,
        ageMonths,
        ageDays,
        birthDate: child.birthDate,
      },
      questionnaire,
      version: questionnaire.versions[0],
    };
  }

  private async createQuestionnaire(dto: any) {
    return this.prisma.questionnaire.create({
      data: {
        code: dto.code,
        title: dto.title,
        minMonth: dto.minMonth,
        minDay: dto.minDay ?? 0,
        maxMonth: dto.maxMonth,
        maxDay: dto.maxDay ?? 0,
        language: dto.language,
      },
    });
  }

  private async createVersionRecord(
    questionnaireId: number,
    version: string,
    structure: any,
  ) {
    return this.prisma.questionnaireVersion.create({
      data: {
        questionnaireId,
        version,
        structureJson: structure,
      },
    });
  }

  private buildStructureFromManual(dto: CreateManualQuestionnaireDto) {
    const domains = dto.domains.map((domain) => {
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

  private validateDomainsCount(domains: any[]) {
    if (domains.length !== 5) {
      throw new BadRequestException('Must have exactly 5 domains');
    }

    for (const domain of domains) {
      if (domain.questions.length !== 6) {
        throw new BadRequestException(
          `Domain ${domain.title} must have exactly 6 questions`,
        );
      }
    }
  }

  private validateStructure(structure: any) {
    if (!structure.domains || !Array.isArray(structure.domains)) {
      throw new BadRequestException('Structure must have domains array');
    }

    if (structure.domains.length !== 5) {
      throw new BadRequestException('Must have exactly 5 domains');
    }

    const questionIds = new Set<string>();

    for (const domain of structure.domains) {
      this.validateDomain(domain);
      this.validateDomainQuestions(domain, questionIds);
    }

    this.validateRules(structure.rules);
  }

  private validateDomain(domain: any) {
    if (!domain.key || !domain.title || domain.cutoff_score === undefined) {
      throw new BadRequestException(
        'Domain missing required fields: key, title, cutoff_score',
      );
    }

    if (!domain.questions || !Array.isArray(domain.questions)) {
      throw new BadRequestException(
        `Domain ${domain.title} must have questions array`,
      );
    }

    if (domain.questions.length !== 6) {
      throw new BadRequestException(
        `Domain ${domain.title} must have exactly 6 questions`,
      );
    }
  }

  private validateDomainQuestions(domain: any, questionIds: Set<string>) {
    for (const q of domain.questions) {
      if (!q.id || !q.text || q.sort_order === undefined) {
        throw new BadRequestException(
          'Question missing required fields: id, text, sort_order',
        );
      }

      if (questionIds.has(q.id)) {
        throw new BadRequestException(`Duplicate question ID: ${q.id}`);
      }
      questionIds.add(q.id);
    }
  }

  private validateRules(rules: any) {
    if (!rules || !rules.score_values) {
      throw new BadRequestException('Structure must have rules.score_values');
    }

    const scoreValues = rules.score_values;
    if (
      scoreValues.Y === undefined ||
      scoreValues.S === undefined ||
      scoreValues.N === undefined
    ) {
      throw new BadRequestException('score_values must have Y, S, N keys');
    }

    if (typeof rules.monitor_margin !== 'number') {
      throw new BadRequestException('monitor_margin must be a number');
    }
  }
}
