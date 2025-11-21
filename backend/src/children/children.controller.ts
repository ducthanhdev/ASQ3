import { Controller, Get, Param, ParseIntPipe } from '@nestjs/common';
import { ChildrenService } from './children.service';

@Controller('children')
export class ChildrenController {
  constructor(private readonly childrenService: ChildrenService) {}

  @Get()
  async findAll() {
    return this.childrenService.findAll();
  }

  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return this.childrenService.findOne(id);
  }
}

