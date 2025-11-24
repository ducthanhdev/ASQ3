import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as puppeteer from 'puppeteer';
import * as handlebars from 'handlebars';
import { readFileSync } from 'fs';
import { join } from 'path';
import { existsSync } from 'fs';

@Injectable()
export class ReportsService {
  constructor(private prisma: PrismaService) {}

  async generatePDF(assessmentId: number) {
    const assessment = await this.prisma.assessment.findUnique({
      where: { id: assessmentId },
      include: {
        child: {
          include: {
            parent: true,
          },
        },
        questionnaireVersion: {
          include: {
            questionnaire: true,
          },
        },
        evaluator: true,
        reviewedBy: true,
      },
    });

    if (!assessment) {
      throw new NotFoundException('Assessment not found');
    }

    const templateData = this.mapAssessmentToTemplateData(assessment);
    const html = this.compileTemplate(templateData);
    const pdf = await this.renderPDF(html);

    return pdf;
  }

  private mapAssessmentToTemplateData(assessment: any) {
    const domainTitles: Record<string, string> = {
      communication: 'Giao tiếp',
      gross_motor: 'Vận động thô',
      fine_motor: 'Vận động tinh',
      problem_solving: 'Giải quyết vấn đề',
      personal_social: 'Cá nhân - Xã hội',
    };

    const relationshipMap: Record<string, string> = {
      PARENT: 'Cha/Mẹ',
      GUARDIAN: 'Người giám hộ',
      TEACHER: 'Giáo viên',
      CHILDCARE_PROVIDER: 'Người chăm sóc',
      GRANDPARENT: 'Ông/Bà',
      FOSTER_PARENT: 'Cha/Mẹ nuôi',
      OTHER: 'Khác',
    };

    const conclusionMap: Record<string, string> = {
      NORMAL: 'Bình thường',
      MONITOR: 'Cần theo dõi',
      REFER: 'Cần đánh giá chuyên sâu',
    };

    const domainScores = assessment.scoresJson || assessment.summaryResultJson?.domainScores || {};
    const domainResults = Object.entries(domainScores).map(([key, score]: [string, any]) => {
      const resultClass = score.conclusion === 'REFER' ? 'refer' : score.conclusion === 'MONITOR' ? 'monitor' : 'normal';
      return {
        title: domainTitles[key] || key,
        total: score.total,
        cutoff: score.cutoff,
        result_class: resultClass,
        result_text: conclusionMap[score.conclusion] || score.conclusion,
      };
    });

    const evaluatorName = assessment.evaluatorFirstName
      ? [assessment.evaluatorFirstName, assessment.evaluatorMiddleName, assessment.evaluatorLastName]
          .filter(Boolean)
          .join(' ')
      : assessment.evaluator
      ? [assessment.evaluator.firstName, assessment.evaluator.middleName, assessment.evaluator.lastName]
          .filter(Boolean)
          .join(' ') || assessment.evaluator.username
      : 'N/A';

    const relationshipText = assessment.relationship ? relationshipMap[assessment.relationship] : null;

    const finalConclusion = assessment.finalConclusion || assessment.summaryResultJson?.finalConclusion || 'NORMAL';
    const finalConclusionText = this.generateConclusionText(finalConclusion, domainScores, domainTitles);

    const advices = this.generateAdvices(domainScores);

    const reviewer = assessment.reviewedBy || 
      (assessment.evaluator && (assessment.evaluator.role === 'SPECIALIST' || assessment.evaluator.role === 'ADMIN') 
        ? assessment.evaluator 
        : null);

    const isSpecialistOrAdmin = reviewer && 
      (reviewer.role === 'SPECIALIST' || reviewer.role === 'ADMIN');

    let signatureUrl = null;
    let signerName = null;
    let signerRole = null;

    if (isSpecialistOrAdmin) {
      try {
        if (reviewer.signaturePath && existsSync(reviewer.signaturePath)) {
          signatureUrl = `data:image/png;base64,${readFileSync(reviewer.signaturePath).toString('base64')}`;
        } else if (reviewer.signatureBase64) {
          signatureUrl = `data:image/png;base64,${reviewer.signatureBase64}`;
        }
      } catch (e) {
        // Ignore signature read errors
      }

      signerName = [reviewer.firstName, reviewer.middleName, reviewer.lastName]
        .filter(Boolean)
        .join(' ') || reviewer.username;

      signerRole = reviewer.role === 'SPECIALIST' ? 'Chuyên viên' : 'Quản trị viên';
    }

    const ageMonth = Math.floor(
      (assessment.questionnaireVersion.questionnaire.minMonth + assessment.questionnaireVersion.questionnaire.maxMonth) / 2,
    );

    const genderMap: Record<string, string> = {
      MALE: 'Nam',
      FEMALE: 'Nữ',
      OTHER: 'Khác',
    };

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
          const mimeType = logoUrl.endsWith('.svg') ? 'image/svg+xml' : 
                          logoUrl.endsWith('.png') ? 'image/png' : 
                          logoUrl.endsWith('.jpg') || logoUrl.endsWith('.jpeg') ? 'image/jpeg' : 'image/png';
          logoUrl = `data:${mimeType};base64,${logoBase64}`;
        }
      } catch (e) {
        // Ignore logo read errors
      }
    }

    return {
      logo_url: logoUrl,
      org_name: process.env.ORG_NAME || 'Trung tâm đánh giá phát triển trẻ',
      org_address: process.env.ORG_ADDRESS || '',
      org_phone: process.env.ORG_PHONE || '',
      assessment_id: assessment.id,
      age_month: ageMonth,
      child_name: assessment.child.fullName,
      birth_date: new Date(assessment.child.birthDate).toLocaleDateString('vi-VN'),
      gender: genderMap[assessment.child.gender] || assessment.child.gender,
      parent_name: assessment.child.parent?.username || assessment.child.guardianName || 'N/A',
      parent_phone: assessment.child.parent?.phone || assessment.child.guardianPhone || 'N/A',
      evaluator_name: evaluatorName,
      relationship_text: relationshipText,
      fallback_evaluator_name: assessment.evaluator?.username || 'N/A',
      assessment_date: new Date(assessment.assessmentDate).toLocaleDateString('vi-VN'),
      domain_results: domainResults,
      final_conclusion_text: finalConclusionText,
      advices: advices.length > 0 ? advices : null,
      signature_url: signatureUrl,
      signer_name: signerName,
      signer_role: signerRole,
      signed_at: new Date(assessment.completionDate).toLocaleDateString('vi-VN'),
      has_signature: !!signatureUrl,
      has_signer: isSpecialistOrAdmin || false,
    };
  }

  private generateConclusionText(finalConclusion: string, domainScores: any, domainTitles: Record<string, string>) {
    if (finalConclusion === 'NORMAL') {
      return 'Trẻ phát triển trong phạm vi bình thường ở tất cả các lĩnh vực. Tiếp tục theo dõi định kỳ.';
    }

    const referDomains: string[] = [];
    const monitorDomains: string[] = [];

    Object.entries(domainScores).forEach(([key, score]: [string, any]) => {
      if (score.conclusion === 'REFER') {
        referDomains.push(domainTitles[key] || key);
      } else if (score.conclusion === 'MONITOR') {
        monitorDomains.push(domainTitles[key] || key);
      }
    });

    let text = '';

    if (referDomains.length > 0) {
      text += `Trẻ có dấu hiệu chậm phát triển đáng kể ở các lĩnh vực: ${referDomains.join(', ')}. `;
      text += 'Cần được đánh giá chuyên sâu bởi chuyên gia.';
    } else if (monitorDomains.length > 0) {
      text += `Trẻ có nguy cơ chậm phát triển ở các lĩnh vực: ${monitorDomains.join(', ')}. `;
      text += 'Cần tiếp tục theo dõi và đánh giá lại sau một thời gian.';
    }

    return text;
  }

  private generateAdvices(domainScores: any): string[] {
    const advices: string[] = [];

    if (domainScores.communication?.conclusion === 'MONITOR' || domainScores.communication?.conclusion === 'REFER') {
      advices.push('Tăng cường giao tiếp với trẻ qua trò chơi có phát âm');
      advices.push('Khuyến khích trẻ tương tác 2 chiều');
      advices.push('Đọc sách và kể chuyện cho trẻ nghe hàng ngày');
    }

    if (domainScores.gross_motor?.conclusion === 'MONITOR' || domainScores.gross_motor?.conclusion === 'REFER') {
      advices.push('Khuyến khích trẻ siêng ngồi chòi chân');
      advices.push('Cho trẻ bò lên - xuống ghế sofa thấp');
      advices.push('Tập đi có hỗ trợ');
      advices.push('Tăng cường hoạt động vận động ngoài trời');
    }

    if (domainScores.fine_motor?.conclusion === 'MONITOR' || domainScores.fine_motor?.conclusion === 'REFER') {
      advices.push('Cho trẻ chơi với đồ chơi nhỏ để phát triển kỹ năng cầm nắm');
      advices.push('Khuyến khích trẻ vẽ, tô màu');
      advices.push('Tập xếp khối, lắp ráp đồ chơi');
    }

    if (domainScores.problem_solving?.conclusion === 'MONITOR' || domainScores.problem_solving?.conclusion === 'REFER') {
      advices.push('Chơi trò chơi giải đố phù hợp với lứa tuổi');
      advices.push('Khuyến khích trẻ tự giải quyết vấn đề đơn giản');
      advices.push('Tăng cường hoạt động khám phá, tìm hiểu');
    }

    if (domainScores.personal_social?.conclusion === 'MONITOR' || domainScores.personal_social?.conclusion === 'REFER') {
      advices.push('Tăng cường tương tác xã hội với bạn bè cùng tuổi');
      advices.push('Khuyến khích trẻ tham gia hoạt động nhóm');
      advices.push('Dạy trẻ cách chia sẻ và chờ đợi');
    }

    return advices;
  }

  private compileTemplate(data: any): string {
    const distPath = join(__dirname, 'templates', 'asq3-report.hbs');
    const srcPath = join(process.cwd(), 'src', 'reports', 'templates', 'asq3-report.hbs');
    
    let templatePath = distPath;
    if (!existsSync(templatePath)) {
      templatePath = srcPath;
    }
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

