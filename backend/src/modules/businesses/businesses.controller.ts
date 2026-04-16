import { Controller, Get, Patch, Body, UseGuards, Request } from '@nestjs/common';
import { JwtAuthGuard }      from '../auth/jwt-auth.guard';
import { BusinessesService } from './businesses.service';

@Controller('businesses')
@UseGuards(JwtAuthGuard)
export class BusinessesController {
  constructor(private svc: BusinessesService) {}

  @Get('me')
  getMe(@Request() req) {
    return this.svc.findById(req.user.businessId);
  }

  @Get('me/stats')
  getStats(@Request() req) {
    return this.svc.getStats(req.user.businessId);
  }

  @Patch('me/whatsapp')
  updateWhatsApp(@Request() req, @Body() dto: any) {
    return this.svc.updateWhatsApp(req.user.businessId, dto);
  }
}
