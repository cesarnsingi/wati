import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards, Request } from '@nestjs/common';
import { JwtAuthGuard }     from '../auth/jwt-auth.guard';
import { CampaignsService } from './campaigns.service';

@Controller('campaigns')
@UseGuards(JwtAuthGuard)
export class CampaignsController {
  constructor(private svc: CampaignsService) {}

  @Get()
  list(@Request() req) {
    return this.svc.list(req.user.businessId);
  }

  @Get(':id')
  findOne(@Request() req, @Param('id') id: string) {
    return this.svc.findOne(req.user.businessId, id);
  }

  @Post()
  create(@Request() req, @Body() dto: any) {
    return this.svc.create(req.user.businessId, req.user.userId, dto);
  }

  @Patch(':id')
  update(@Request() req, @Param('id') id: string, @Body() dto: any) {
    return this.svc.update(req.user.businessId, id, dto);
  }

  @Post(':id/launch')
  launch(@Request() req, @Param('id') id: string) {
    return this.svc.launch(req.user.businessId, id);
  }

  @Post(':id/pause')
  pause(@Request() req, @Param('id') id: string) {
    return this.svc.pause(req.user.businessId, id);
  }

  @Delete(':id')
  delete(@Request() req, @Param('id') id: string) {
    return this.svc.delete(req.user.businessId, id);
  }
}
