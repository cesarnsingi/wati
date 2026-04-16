import {
  Controller, Post, Get, Body, Param, Query,
  UseGuards, Request, ParseUUIDPipe,
} from '@nestjs/common';
import { IsString, IsOptional, IsIn, IsUUID } from 'class-validator';
import { JwtAuthGuard }    from '../auth/jwt-auth.guard';
import { MessagesService } from './messages.service';

// ── DTOs ──────────────────────────────────────────────────────────────────────
class SendTextDto {
  @IsUUID()   conversationId: string;
  @IsString() content:        string;
  @IsOptional() @IsString() replyToWaId?: string;
}

class SendTemplateDto {
  @IsUUID()   conversationId:   string;
  @IsString() templateName:     string;
  @IsString() templateLanguage: string;
  @IsOptional() components?:    any[];
}

// ── Controller ────────────────────────────────────────────────────────────────
@Controller('messages')
@UseGuards(JwtAuthGuard)
export class MessagesController {
  constructor(private svc: MessagesService) {}

  // GET /messages?conversationId=xxx&page=1&limit=50
  @Get()
  list(
    @Request() req,
    @Query('conversationId') conversationId: string,
    @Query('page')           page:    number = 1,
    @Query('limit')          limit:   number = 50,
  ) {
    return this.svc.list(req.user.businessId, conversationId, +page, +limit);
  }

  // POST /messages/text
  @Post('text')
  sendText(@Request() req, @Body() dto: SendTextDto) {
    return this.svc.sendText(req.user.businessId, req.user.userId, dto);
  }

  // POST /messages/template
  @Post('template')
  sendTemplate(@Request() req, @Body() dto: SendTemplateDto) {
    return this.svc.sendTemplate(req.user.businessId, req.user.userId, dto);
  }
}
