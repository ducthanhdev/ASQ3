import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
  await prisma.questionnaire.create({
    data: {
      code: "ASQ_2M",
      title: "ASQ - 2 months",
      minMonth: 1,
      maxMonth: 2,
      language: "vi",
      versions: {
        create: {
          version: "v1.0",
          structureJson: {
            metadata: { age_group: "2 Months" },
            domains: [],
            overall_section: [],
            rules: { score_values: {Y:10,S:5,N:0}, monitor_margin:2 }
          }
        }
      }
    }
  });

  await prisma.questionnaire.create({
    data: {
      code: "ASQ_4M",
      title: "ASQ - 4 months",
      minMonth: 3,
      maxMonth: 4,
      language: "vi",
      versions: {
        create: {
          version: "v1.0",
          structureJson: {
            metadata: { age_group: "4 Months" },
            domains: [],
            overall_section: [],
            rules: { score_values: {Y:10,S:5,N:0}, monitor_margin:2 }
          }
        }
      }
    }
  });

  await prisma.questionnaire.create({
    data: {
      code: "ASQ_6M",
      title: "ASQ - 6 months",
      minMonth: 5,
      maxMonth: 6,
      language: "vi",
      versions: {
        create: {
          version: "v1.0",
          structureJson: {
            metadata: { age_group: "6 Months" },
            domains: [],
            overall_section: [],
            rules: { score_values: {Y:10,S:5,N:0}, monitor_margin:2 }
          }
        }
      }
    }
  });
}

main().finally(()=>prisma.$disconnect());
