import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ChildrenService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.child.findMany({
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async findOne(id: number) {
    return this.prisma.child.findUnique({
      where: { id },
    });
  }
}

