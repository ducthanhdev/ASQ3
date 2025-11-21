import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateChildDto } from './dto/create-child.dto';
import { UpdateChildDto } from './dto/update-child.dto';

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
    const child = await this.prisma.child.findUnique({ where: { id } });
    if (!child) throw new NotFoundException();

    if (user.role === 'PARENT' && child.parentId !== user.userId) {
      throw new ForbiddenException();
    }

    return child;
  }

  create(dto: CreateChildDto, user: any) {
    const parentId = user.role === 'PARENT' ? user.userId : null;

    return this.prisma.child.create({
      data: {
        fullName: dto.fullName,
        birthDate: new Date(dto.birthDate),
        prematureWeeks: dto.prematureWeeks || 0,
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
        ...(dto.fullName && { fullName: dto.fullName }),
        ...(dto.birthDate && { birthDate: new Date(dto.birthDate) }),
        ...(dto.prematureWeeks !== undefined && { prematureWeeks: dto.prematureWeeks }),
      },
    });
  }

  remove(id: number) {
    return this.prisma.child.delete({ where: { id } });
  }
}


