import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards, Request } from '@nestjs/common';
import { JwtAuthGuard }       from '../auth/jwt-auth.guard';
import { AutomationsService } from './automations.service';
import { InjectRepository }   from '@nestjs/typeorm';
import { Repository }         from 'typeorm';
import { Automation }         from './automation.entity';
import { AutomationLog }      from './automation-log.entity';

@Controller('automations')
@UseGuards(JwtAuthGuard)
export class AutomationsController {
  constructor(
    private svc: AutomationsService,
    @InjectRepository(Automation)    private autos: Repository<Automation>,
    @InjectRepository(AutomationLog) private logs:  Repository<AutomationLog>,
  ) {}

  @Get()
  list(@Request() req) {
    return this.autos.find({
      where: { businessId: req.user.businessId },
      order: { createdAt: 'DESC' },
    });
  }

  @Get(':id')
  findOne(@Request() req, @Param('id') id: string) {
    return this.autos.findOne({ where: { id, businessId: req.user.businessId } });
  }

  @Get(':id/logs')
  logs(@Request() req, @Param('id') id: string) {
    return this.logs.find({
      where: { automationId: id },
      order: { startedAt: 'DESC' },
      take:  100,
    });
  }

  @Post()
  create(@Request() req, @Body() dto: any) {
    const auto = this.autos.create({
      ...dto,
      businessId: req.user.businessId,
      createdBy:  req.user.userId,
    });
    return this.autos.save(auto);
  }

  @Patch(':id')
  update(@Request() req, @Param('id') id: string, @Body() dto: any) {
    return this.autos.update({ id, businessId: req.user.businessId }, dto);
  }

  @Patch(':id/toggle')
  async toggle(@Request() req, @Param('id') id: string) {
    const auto = await this.autos.findOne({ where: { id, businessId: req.user.businessId } });
    if (!auto) return null;
    await this.autos.update(id, { isActive: !auto.isActive });
    return this.autos.findOne({ where: { id } });
  }

  @Delete(':id')
  delete(@Request() req, @Param('id') id: string) {
    return this.autos.delete({ id, businessId: req.user.businessId });
  }
}
