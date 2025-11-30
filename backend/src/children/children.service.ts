import {
  Injectable,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateChildDto } from './dto/create-child.dto';
import { UpdateChildDto } from './dto/update-child.dto';
import { computeAge, computeAdjustedAge } from '../common/utils/age.util';
import { Gender } from '@prisma/client';

@Injectable()
export class ChildrenService {
  constructor(private prisma: PrismaService) {}

  findAll() {
    return this.prisma.child.findMany({
      include: { parent: { select: { id: true, username: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  findByParent(parentId: number) {
    return this.prisma.child.findMany({
      where: { parentId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: number, user: any) {
    const child = await this.prisma.child.findUnique({
      where: { id },
      include: {
        parent: { select: { id: true, username: true, email: true } },
        assessments: {
          select: {
            id: true,
            createdAt: true,
            summaryResultJson: true,
            finalConclusion: true,
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!child) throw new NotFoundException();

    if (user.role === 'PARENT' && child.parentId !== user.userId) {
      throw new ForbiddenException();
    }

    const ageMonths = computeAge(child.birthDate);
    const adjustedAgeMonths = computeAdjustedAge(
      child.birthDate,
      new Date(),
      child.prematureWeeks,
    );

    return {
      ...child,
      ageMonths,
      adjustedAgeMonths,
    };
  }

  create(dto: CreateChildDto, user: any) {
    const parentId = user.role === 'PARENT' ? user.userId : null;
    const fullName = this.buildFullName(
      dto.lastName,
      dto.middleName,
      dto.firstName,
    );

    return this.prisma.child.create({
      data: {
        firstName: dto.firstName,
        middleName: dto.middleName,
        lastName: dto.lastName,
        fullName,
        gender: dto.gender as Gender,
        birthDate: new Date(dto.birthDate),
        prematureWeeks: dto.prematureWeeks || 0,
        guardianName: dto.guardianName,
        guardianPhone: dto.guardianPhone,
        note: dto.note,
        registrationNumber: dto.registrationNumber,
        parentId,
      },
    });
  }

  async update(id: number, dto: UpdateChildDto, user: any) {
    const child = await this.prisma.child.findUnique({ where: { id } });
    if (!child) throw new NotFoundException();

    if (user.role === 'PARENT' && child.parentId !== user.userId) {
      throw new ForbiddenException();
    }

    const updateData: any = {};

    if (dto.firstName !== undefined || dto.middleName !== undefined || dto.lastName !== undefined) {
      const firstName = dto.firstName ?? child.firstName;
      const middleName = dto.middleName ?? child.middleName;
      const lastName = dto.lastName ?? child.lastName;
      updateData.firstName = firstName;
      updateData.middleName = middleName;
      updateData.lastName = lastName;
      updateData.fullName = this.buildFullName(lastName, middleName, firstName);
    }

    if (dto.gender !== undefined) updateData.gender = dto.gender as Gender;
    if (dto.birthDate !== undefined) updateData.birthDate = new Date(dto.birthDate);
    if (dto.prematureWeeks !== undefined) updateData.prematureWeeks = dto.prematureWeeks;
    if (dto.guardianName !== undefined) updateData.guardianName = dto.guardianName;
    if (dto.guardianPhone !== undefined) updateData.guardianPhone = dto.guardianPhone;
    if (dto.note !== undefined) updateData.note = dto.note;
    if (dto.registrationNumber !== undefined) updateData.registrationNumber = dto.registrationNumber;

    return this.prisma.child.update({
      where: { id },
      data: updateData,
    });
  }

  remove(id: number) {
    return this.prisma.child.delete({ where: { id } });
  }

  async getAssessments(id: number, user: any) {
    const child = await this.prisma.child.findUnique({ where: { id } });
    if (!child) throw new NotFoundException();

    if (user.role === 'PARENT' && child.parentId !== user.userId) {
      throw new ForbiddenException();
    }

    return this.prisma.assessment.findMany({
      where: { childId: id },
      orderBy: { createdAt: 'desc' },
    });
  }

  private buildFullName(lastName?: string, middleName?: string, firstName?: string): string {
    return [lastName, middleName, firstName].filter(Boolean).join(' ');
  }
}
