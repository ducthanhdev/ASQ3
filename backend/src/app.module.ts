import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { AppController } from './app.controller';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { ChildrenModule } from './children/children.module';
import { QuestionnaireModule } from './questionnaire/questionnaire.module';
import { AssessmentsModule } from './assessments/assessments.module';
import { UsersModule } from './users/users.module';
import { ReportsModule } from './reports/reports.module';
import { OcrModule } from './ocr/ocr.module';
import { RolesGuard } from './auth/guards/roles.guard';

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
    UsersModule,
    ReportsModule,
    OcrModule,
  ],
  controllers: [AppController],
  providers: [
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
  ],
})
export class AppModule {}

