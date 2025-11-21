import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
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

    return this.prisma.child.create({
      data: {
        fullName: dto.fullName,
        gender: dto.gender as Gender,
        birthDate: new Date(dto.birthDate),
        prematureWeeks: dto.prematureWeeks || 0,
        guardianName: dto.guardianName,
        guardianPhone: dto.guardianPhone,
        note: dto.note,
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

    return this.prisma.child.update({
      where: { id },
      data: {
        fullName: dto.fullName,
        gender: dto.gender as Gender,
        birthDate: dto.birthDate ? new Date(dto.birthDate) : undefined,
        prematureWeeks: dto.prematureWeeks,
        guardianName: dto.guardianName,
        guardianPhone: dto.guardianPhone,
        note: dto.note,
      },
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
}
