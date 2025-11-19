import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { ChildrenModule } from './children/children.module';
import { QuestionnaireModule } from './questionnaire/questionnaire.module';
import { AssessmentsModule } from './assessments/assessments.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    PrismaModule,
    AuthModule,
    ChildrenModule,
    QuestionnaireModule,
    AssessmentsModule,
  ],
  controllers: [AppController],
})
export class AppModule {}

