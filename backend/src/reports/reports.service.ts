import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as puppeteer from 'puppeteer';
import * as handlebars from 'handlebars';
import { readFileSync } from 'fs';
import { join } from 'path';
import { existsSync } from 'fs';

@Injectable()
export class ReportsService {
  private readonly domainTitles: Record<string, string> = {
    communication: 'Giao tiếp',
    gross_motor: 'Vận động thô',
    fine_motor: 'Vận động tinh',
    problem_solving: 'Giải quyết vấn đề',
    personal_social: 'Cá nhân - Xã hội',
  };

  private readonly relationshipMap: Record<string, string> = {
    PARENT: 'Cha/Mẹ',
    GUARDIAN: 'Người giám hộ',
    TEACHER: 'Giáo viên',
    CHILDCARE_PROVIDER: 'Người chăm sóc',
    GRANDPARENT: 'Ông/Bà',
    FOSTER_PARENT: 'Cha/Mẹ nuôi',
    OTHER: 'Khác',
  };

  private readonly conclusionMap: Record<string, string> = {
    NORMAL: 'Bình thường',
    MONITOR: 'Cần theo dõi',
    REFER: 'Cần đánh giá chuyên sâu',
  };

  private readonly genderMap: Record<string, string> = {
    MALE: 'Nam',
    FEMALE: 'Nữ',
    OTHER: 'Khác',
  };

  constructor(private prisma: PrismaService) {}

  async generatePDF(assessmentId: number) {
    const assessment = await this.prisma.assessment.findUnique({
      where: { id: assessmentId },
      include: {
        child: { include: { parent: true } },
        questionnaireVersion: { include: { questionnaire: true } },
        evaluator: true,
        reviewedBy: true,
      },
    });

    if (!assessment) {
      throw new NotFoundException('Assessment not found');
    }

    const templateData = this.mapAssessmentToTemplateData(assessment);
    const html = this.compileTemplate(templateData);
    return this.renderPDF(html);
  }

  private mapAssessmentToTemplateData(assessment: any) {
    const domainScores =
      assessment.scoresJson || assessment.summaryResultJson?.domainScores || {};

    return {
      logo_url: this.getLogoUrl(),
      org_name: process.env.ORG_NAME || 'Trung tâm đánh giá phát triển trẻ',
      org_address: process.env.ORG_ADDRESS || '',
      org_phone: process.env.ORG_PHONE || '',
      assessment_id: assessment.id,
      age_month: this.calculateAgeMonth(assessment),
      child_name: assessment.child.fullName,
      birth_date: new Date(assessment.child.birthDate).toLocaleDateString('vi-VN'),
      gender: this.genderMap[assessment.child.gender] || assessment.child.gender,
      parent_name: this.getParentName(assessment.child),
      parent_phone: this.getParentPhone(assessment.child),
      evaluator_name: this.getEvaluatorName(assessment),
      relationship_text: this.getRelationshipText(assessment.relationship),
      fallback_evaluator_name: assessment.evaluator?.username || 'N/A',
      assessment_date: new Date(assessment.assessmentDate).toLocaleDateString('vi-VN'),
      domain_results: this.mapDomainResults(domainScores),
      final_conclusion_text: this.generateConclusionText(
        assessment.finalConclusion || assessment.summaryResultJson?.finalConclusion || 'NORMAL',
        domainScores,
      ),
      advices: this.generateAdvices(domainScores),
      ...this.getSignatureData(assessment),
      signed_at: new Date(assessment.completionDate).toLocaleDateString('vi-VN'),
    };
  }

  private calculateAgeMonth(assessment: any): number {
    const { minMonth, maxMonth } = assessment.questionnaireVersion.questionnaire;
    return Math.floor((minMonth + maxMonth) / 2);
  }

  private getParentName(child: any): string {
    return child.parent?.username || child.guardianName || 'N/A';
  }

  private getParentPhone(child: any): string {
    return child.parent?.phone || child.guardianPhone || 'N/A';
  }

  private getEvaluatorName(assessment: any): string {
    if (assessment.evaluatorFirstName) {
      return [assessment.evaluatorFirstName, assessment.evaluatorMiddleName, assessment.evaluatorLastName]
        .filter(Boolean)
        .join(' ');
    }

    if (assessment.evaluator) {
      const name = [assessment.evaluator.firstName, assessment.evaluator.middleName, assessment.evaluator.lastName]
        .filter(Boolean)
        .join(' ');
      return name || assessment.evaluator.username;
    }

    return 'N/A';
  }

  private getRelationshipText(relationship: string | null): string | null {
    return relationship ? this.relationshipMap[relationship] : null;
  }

  private mapDomainResults(domainScores: any) {
    return Object.entries(domainScores).map(([key, score]: [string, any]) => {
      const resultClass =
        score.conclusion === 'REFER' ? 'refer' : score.conclusion === 'MONITOR' ? 'monitor' : 'normal';
      return {
        title: this.domainTitles[key] || key,
        total: score.total,
        cutoff: score.cutoff,
        result_class: resultClass,
        result_text: this.conclusionMap[score.conclusion] || score.conclusion,
      };
    });
  }

  private generateConclusionText(finalConclusion: string, domainScores: any): string {
    if (finalConclusion === 'NORMAL') {
      return 'Trẻ phát triển trong phạm vi bình thường ở tất cả các lĩnh vực. Tiếp tục theo dõi định kỳ.';
    }

    const referDomains: string[] = [];
    const monitorDomains: string[] = [];

    Object.entries(domainScores).forEach(([key, score]: [string, any]) => {
      if (score.conclusion === 'REFER') {
        referDomains.push(this.domainTitles[key] || key);
      } else if (score.conclusion === 'MONITOR') {
        monitorDomains.push(this.domainTitles[key] || key);
      }
    });

    if (referDomains.length > 0) {
      return `Trẻ có dấu hiệu chậm phát triển đáng kể ở các lĩnh vực: ${referDomains.join(', ')}. Cần được đánh giá chuyên sâu bởi chuyên gia.`;
    }

    if (monitorDomains.length > 0) {
      return `Trẻ có nguy cơ chậm phát triển ở các lĩnh vực: ${monitorDomains.join(', ')}. Cần tiếp tục theo dõi và đánh giá lại sau một thời gian.`;
    }

    return '';
  }

  private generateAdvices(domainScores: any): string[] {
    const advices: string[] = [];

    if (this.needsAdvice(domainScores.communication)) {
      advices.push('Tăng cường giao tiếp với trẻ qua trò chơi có phát âm');
      advices.push('Khuyến khích trẻ tương tác 2 chiều');
      advices.push('Đọc sách và kể chuyện cho trẻ nghe hàng ngày');
    }

    if (this.needsAdvice(domainScores.gross_motor)) {
      advices.push('Khuyến khích trẻ siêng ngồi chòi chân');
      advices.push('Cho trẻ bò lên - xuống ghế sofa thấp');
      advices.push('Tập đi có hỗ trợ');
      advices.push('Tăng cường hoạt động vận động ngoài trời');
    }

    if (this.needsAdvice(domainScores.fine_motor)) {
      advices.push('Cho trẻ chơi với đồ chơi nhỏ để phát triển kỹ năng cầm nắm');
      advices.push('Khuyến khích trẻ vẽ, tô màu');
      advices.push('Tập xếp khối, lắp ráp đồ chơi');
    }

    if (this.needsAdvice(domainScores.problem_solving)) {
      advices.push('Chơi trò chơi giải đố phù hợp với lứa tuổi');
      advices.push('Khuyến khích trẻ tự giải quyết vấn đề đơn giản');
      advices.push('Tăng cường hoạt động khám phá, tìm hiểu');
    }

    if (this.needsAdvice(domainScores.personal_social)) {
      advices.push('Tăng cường tương tác xã hội với bạn bè cùng tuổi');
      advices.push('Khuyến khích trẻ tham gia hoạt động nhóm');
      advices.push('Dạy trẻ cách chia sẻ và chờ đợi');
    }

    return advices;
  }

  private needsAdvice(domain: any): boolean {
    return domain?.conclusion === 'MONITOR' || domain?.conclusion === 'REFER';
  }

  private getSignatureData(assessment: any) {
    const reviewer = this.getReviewer(assessment);
    const isSpecialistOrAdmin = reviewer && (reviewer.role === 'SPECIALIST' || reviewer.role === 'ADMIN');

    if (!isSpecialistOrAdmin) {
      return {
        signature_url: null,
        signer_name: null,
        signer_role: null,
        has_signature: false,
        has_signer: false,
      };
    }

    const signatureUrl = this.getSignatureUrl(reviewer);
    const signerName = this.getSignerName(reviewer);
    const signerRole = reviewer.role === 'SPECIALIST' ? 'Chuyên viên' : 'Quản trị viên';

    return {
      signature_url: signatureUrl,
      signer_name: signerName,
      signer_role: signerRole,
      has_signature: !!signatureUrl,
      has_signer: true,
    };
  }

  private getReviewer(assessment: any) {
    if (assessment.reviewedBy) return assessment.reviewedBy;
    if (assessment.evaluator && (assessment.evaluator.role === 'SPECIALIST' || assessment.evaluator.role === 'ADMIN')) {
      return assessment.evaluator;
    }
    return null;
  }

  private getSignatureUrl(reviewer: any): string | null {
    try {
      if (reviewer.signaturePath && existsSync(reviewer.signaturePath)) {
        return `data:image/png;base64,${readFileSync(reviewer.signaturePath).toString('base64')}`;
      }
      if (reviewer.signatureBase64) {
        return `data:image/png;base64,${reviewer.signatureBase64}`;
      }
    } catch {
      // Ignore signature read errors
    }
    return null;
  }

  private getSignerName(reviewer: any): string {
    const name = [reviewer.firstName, reviewer.middleName, reviewer.lastName]
      .filter(Boolean)
      .join(' ');
    return name || reviewer.username;
  }

  private getLogoUrl(): string {
    let logoUrl = process.env.LOGO_URL || '';
    if (!logoUrl) {
      const defaultLogoPath = join(process.cwd(), 'public', 'logos', 'asq3-logo.svg');
      if (existsSync(defaultLogoPath)) {
        logoUrl = defaultLogoPath;
      }
    }

    if (logoUrl && !logoUrl.startsWith('http') && !logoUrl.startsWith('data:')) {
      try {
        if (existsSync(logoUrl)) {
          const logoBuffer = readFileSync(logoUrl);
          const logoBase64 = logoBuffer.toString('base64');
          const mimeType = this.getMimeType(logoUrl);
          logoUrl = `data:${mimeType};base64,${logoBase64}`;
        }
      } catch {
        // Ignore logo read errors
      }
    }

    return logoUrl;
  }

  private getMimeType(filePath: string): string {
    if (filePath.endsWith('.svg')) return 'image/svg+xml';
    if (filePath.endsWith('.png')) return 'image/png';
    if (filePath.endsWith('.jpg') || filePath.endsWith('.jpeg')) return 'image/jpeg';
    return 'image/png';
  }

  private compileTemplate(data: any): string {
    const distPath = join(__dirname, 'templates', 'asq3-report.hbs');
    const srcPath = join(process.cwd(), 'src', 'reports', 'templates', 'asq3-report.hbs');

    const templatePath = existsSync(distPath) ? distPath : srcPath;
    if (!existsSync(templatePath)) {
      throw new Error(`Template not found at ${distPath} or ${srcPath}`);
    }

    const templateSource = readFileSync(templatePath, 'utf-8');
    const template = handlebars.compile(templateSource);
    return template(data);
  }

  private async renderPDF(html: string): Promise<Buffer> {
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    try {
      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: 'networkidle0' });

      const pdf = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: {
          top: '20mm',
          bottom: '20mm',
          left: '15mm',
          right: '15mm',
        },
      });

      return Buffer.from(pdf);
    } finally {
      await browser.close();
    }
  }
}
