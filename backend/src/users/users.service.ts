import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import * as bcrypt from 'bcryptjs';

const USER_SELECT_FIELDS = {
  id: true,
  username: true,
  email: true,
  role: true,
  createdAt: true,
  lastLoginAt: true,
};

const USER_SELECT_FIELDS_NO_LOGIN = {
  id: true,
  username: true,
  email: true,
  role: true,
  createdAt: true,
};

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  findAll() {
    return this.prisma.user.findMany({
      select: USER_SELECT_FIELDS,
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: number) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: USER_SELECT_FIELDS,
    });
    if (!user) throw new NotFoundException();
    return user;
  }

  async create(dto: CreateUserDto) {
    const existing = await this.prisma.user.findFirst({
      where: {
        OR: [
          { username: dto.username },
          ...(dto.email ? [{ email: dto.email }] : []),
        ],
      },
    });
    if (existing) {
      throw new ConflictException('Username or email already exists');
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);

    return this.prisma.user.create({
      data: {
        username: dto.username,
        email: dto.email,
        passwordHash,
        role: (dto.role as any) || 'PARENT',
      },
      select: USER_SELECT_FIELDS_NO_LOGIN,
    });
  }

  async update(id: number, dto: UpdateUserDto) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException();

    const data: any = {};
    if (dto.email !== undefined) data.email = dto.email;
    if (dto.role !== undefined) data.role = dto.role as any;
    if (dto.password) {
      data.passwordHash = await bcrypt.hash(dto.password, 10);
    }

    return this.prisma.user.update({
      where: { id },
      data,
      select: USER_SELECT_FIELDS_NO_LOGIN,
    });
  }

  async updateRole(id: number, role: string) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException();

    return this.prisma.user.update({
      where: { id },
      data: { role: role as any },
      select: USER_SELECT_FIELDS_NO_LOGIN,
    });
  }

  remove(id: number) {
    return this.prisma.user.delete({ where: { id } });
  }
}
