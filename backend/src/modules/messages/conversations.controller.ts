import {
  Controller, Get, Patch, Body, Param,
  Query, UseGuards, Request,
} from '@nestjs/common';
import { JwtAuthGuard }  from '../auth/jwt-auth.guard';
import { MessagesService } from '../messages/messages.service';

@Controller('conversations')
@UseGuards(JwtAuthGuard)
export class ConversationsController {
  constructor(private svc: MessagesService) {}

  @Get()
  list(
    @Request() req,
    @Query('status')  status?:  string,
    @Query('agentId') agentId?: string,
    @Query('page')    page?:    number,
    @Query('limit')   limit?:   number,
  ) {
    return this.svc.getConversations(req.user.businessId, {
      status, agentId, page: +page, limit: +limit,
    });
  }

  @Patch(':id/assign')
  assign(
    @Param('id') id: string,
    @Body('agentId') agentId: string,
  ) {
    return this.svc.assignConversation(id, agentId);
  }

  @Patch(':id/resolve')
  resolve(@Param('id') id: string) {
    return this.svc.resolveConversation(id);
  }

  @Patch(':id/reopen')
  reopen(@Param('id') id: string) {
    return this.svc.reopenConversation(id);
  }
}
