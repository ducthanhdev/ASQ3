import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 START SEEDING…');

  console.log('🧹 Cleaning up old data...');
  await prisma.assessment.deleteMany({});
  await prisma.questionnaireVersion.deleteMany({});
  await prisma.questionnaire.deleteMany({});
  await prisma.child.deleteMany({});
  await prisma.user.deleteMany({});
  console.log('✓ Old data cleaned');


  const questionnaire = await prisma.questionnaire.create({
    data: {
      code: 'ASQ3_2M',
      title: 'ASQ-3 2 tháng tuổi',
      minMonth: 1,
      maxMonth: 2,
      language: 'vi',
    },
  });

  console.log('✓ Questionnaire created');

  const structureJson = {
    metadata: {
      age_group: '2 Months',
    },
    domains: [
      {
        key: 'communication',
        title: 'Giao tiếp',
        questions: [
          {
            id: 'q1',
            sort_order: 1,
            text: 'Trẻ có đôi khi phát âm Ê A hay ríu rít?',
          },
          {
            id: 'q2',
            sort_order: 2,
            text: 'Trẻ có phát ra những âm thanh như "ooo", "oah", "aah"?',
          },
          {
            id: 'q3',
            sort_order: 3,
            text: 'Trẻ có phát âm đáp lại khi anh/chị nói chuyện không?',
          },
          {
            id: 'q4',
            sort_order: 4,
            text: 'Trẻ có cười khi anh/chị nói chuyện?',
          },
          {
            id: 'q5',
            sort_order: 5,
            text: 'Trẻ có cười tủm tỉm nhẹ?',
          },
          {
            id: 'q6',
            sort_order: 6,
            text: 'Sau khi rời đi, trẻ có cười khi anh/chị quay lại?',
          },
        ],
      },
      {
        key: 'gross_motor',
        title: 'Vận động thô',
        questions: [
          {
            id: 'q7',
            sort_order: 7,
            text: 'Trẻ có cử động chân tay khi nằm ngửa?',
          },
          {
            id: 'q8',
            sort_order: 8,
            text: 'Trẻ có nghiêng đầu khi nằm sấp?',
          },
          {
            id: 'q9',
            sort_order: 9,
            text: 'Trẻ có ngóc đầu lên vài giây?',
          },
          {
            id: 'q10',
            sort_order: 10,
            text: 'Trẻ có đạp chân khi nằm ngửa?',
          },
          {
            id: 'q11',
            sort_order: 11,
            text: 'Trẻ có quay đầu qua lại?',
          },
          {
            id: 'q12',
            sort_order: 12,
            text: 'Trẻ có hạ đầu xuống nhẹ nhàng sau khi ngóc?',
          },
        ],
      },
      {
        key: 'fine_motor',
        title: 'Vận động tinh',
        questions: [
          {
            id: 'q13',
            sort_order: 13,
            text: 'Tay trẻ có nắm chặt khi tỉnh?',
          },
          {
            id: 'q14',
            sort_order: 14,
            text: 'Trẻ có nắm tay khi chạm vào lòng bàn tay?',
          },
          {
            id: 'q15',
            sort_order: 15,
            text: 'Trẻ có giữ đồ chơi một lúc khi đặt vào tay?',
          },
          {
            id: 'q16',
            sort_order: 16,
            text: 'Trẻ có tự lấy tay chạm mặt?',
          },
          {
            id: 'q17',
            sort_order: 17,
            text: 'Trẻ có để tay mở hoặc mở một phần khi thức?',
          },
          {
            id: 'q18',
            sort_order: 18,
            text: 'Trẻ có nắm hoặc cào quần áo?',
          },
        ],
      },
      {
        key: 'problem_solving',
        title: 'Giải quyết vấn đề',
        questions: [
          {
            id: 'q19',
            sort_order: 19,
            text: 'Trẻ có nhìn vật thể cách 20–25cm?',
          },
          {
            id: 'q20',
            sort_order: 20,
            text: 'Trẻ có đưa mắt nhìn theo khi anh/chị đi quanh phòng?',
          },
          {
            id: 'q21',
            sort_order: 21,
            text: 'Trẻ có nhìn theo đồ chơi di chuyển trái–phải?',
          },
          {
            id: 'q22',
            sort_order: 22,
            text: 'Trẻ có nhìn theo đồ chơi di chuyển lên–xuống?',
          },
          {
            id: 'q23',
            sort_order: 23,
            text: 'Trẻ có nhìn đồ chơi khi được đỡ đứng?',
          },
          {
            id: 'q24',
            sort_order: 24,
            text: 'Trẻ có vẫy tay về phía đồ chơi?',
          },
        ],
      },
      {
        key: 'social_personal',
        title: 'Cá nhân/Xã hội',
        questions: [
          {
            id: 'q25',
            sort_order: 25,
            text: 'Trẻ có mút ngay cả khi không ăn?',
          },
          {
            id: 'q26',
            sort_order: 26,
            text: 'Trẻ có khóc khi đói/mệt?',
          },
          {
            id: 'q27',
            sort_order: 27,
            text: 'Trẻ có cười với anh/chị?',
          },
          {
            id: 'q28',
            sort_order: 28,
            text: 'Trẻ có cười lại khi được cười?',
          },
          {
            id: 'q29',
            sort_order: 29,
            text: 'Trẻ có tự nhìn bàn tay mình?',
          },
          {
            id: 'q30',
            sort_order: 30,
            text: 'Trẻ có phản ứng khi thấy sữa/bình sữa?',
          },
        ],
      },
    ],
    overall_section: [],
    rules: {
      score_values: { Y: 10, S: 5, N: 0 },
      monitor_margin: 2,
    },
  };

  const version = await prisma.questionnaireVersion.create({
    data: {
      questionnaireId: questionnaire.id,
      version: 'v1.0',
      structureJson: structureJson,
    },
  });

  console.log('✓ QuestionnaireVersion created with 30 questions');

  const parentPassword = await bcrypt.hash('123456', 10);
  const parent = await prisma.user.create({
    data: {
      username: 'parent',
      email: 'parent@example.com',
      passwordHash: parentPassword,
      role: 'PARENT',
    },
  });

  const adminPassword = await bcrypt.hash('admin123', 10);
  const admin = await prisma.user.create({
    data: {
      username: 'admin',
      email: 'admin@example.com',
      passwordHash: adminPassword,
      role: 'ADMIN',
    },
  });

  console.log('✓ Users created (parent:123456, admin:admin123)');

  const child = await prisma.child.create({
    data: {
      parentId: parent.id,
      firstName: 'A',
      lastName: 'Nguyễn',
      middleName: 'Văn',
      fullName: 'Nguyễn Văn A',
      birthDate: new Date('2024-01-10'),
      prematureWeeks: 0,
    },
  });

  console.log('✓ Child created');

  const assessment = await prisma.assessment.create({
    data: {
      childId: child.id,
      questionnaireVersionId: version.id,
      evaluatorId: parent.id,
      assessmentDate: new Date(),
      answersJson: {
        q1: 'Y',
        q2: 'Y',
        q3: 'S',
        q4: 'Y',
        q5: 'Y',
        q6: 'Y',
        q7: 'Y',
        q8: 'S',
        q9: 'Y',
        q10: 'Y',
        q11: 'Y',
        q12: 'S',
        q13: 'Y',
        q14: 'Y',
        q15: 'Y',
        q16: 'S',
        q17: 'S',
        q18: 'Y',
        q19: 'Y',
        q20: 'S',
        q21: 'Y',
        q22: 'Y',
        q23: 'Y',
        q24: 'S',
        q25: 'Y',
        q26: 'Y',
        q27: 'Y',
        q28: 'Y',
        q29: 'S',
        q30: 'Y',
      },
      scoresJson: {
        communication: 50,
        gross_motor: 45,
        fine_motor: 45,
        problem_solving: 50,
        social_personal: 50,
      },
      summaryResultJson: {
        domainTotals: {
          communication: 50,
          gross_motor: 45,
          fine_motor: 45,
          problem_solving: 50,
          social_personal: 50,
        },
        finalConclusion: 'NORMAL',
      },
      finalConclusion: 'NORMAL',
      method: 'ONLINE',
    },
  });

  console.log('✓ Assessment created');

  console.log('🎉 SEED COMPLETED!');
  console.log(`   - Questionnaire ID: ${questionnaire.id}`);
  console.log(`   - Version ID: ${version.id}`);
  console.log(`   - Child ID: ${child.id}`);
  console.log(`   - Assessment ID: ${assessment.id}`);
}

main()
  .catch((e) => {
    console.error('❌ SEED ERROR:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
