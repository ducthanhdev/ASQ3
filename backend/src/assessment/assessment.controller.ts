import { Controller } from '@nestjs/common';
import { AssessmentService } from './assessment.service';

@Controller('assessments')
export class AssessmentController {
  constructor(private readonly assessmentService: AssessmentService) {}
}

