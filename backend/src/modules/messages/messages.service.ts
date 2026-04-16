import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository }       from 'typeorm';
import { InjectQueue }      from '@nestjs/bull';
import { Queue }            from 'bull';
import { Message }          from './message.entity';
import { Conversation }     from './conversation.entity';
import { Business }         from '../businesses/entities/business.entity';
import { WhatsAppService }  from './whatsapp.service';

@Injectable()
export class MessagesService {
  constructor(
    @InjectRepository(Message)      private messages:      Repository<Message>,
    @InjectRepository(Conversation) private conversations: Repository<Conversation>,
    @InjectRepository(Business)     private businesses:    Repository<Business>,
    @InjectQueue('messages')        private messageQueue:  Queue,
    private wa: WhatsAppService,
  ) {}

  // ── List messages in a conversation ───────────────────────────────────────
  async list(businessId: string, conversationId: string, page: number, limit: number) {
    const [items, total] = await this.messages.findAndCount({
      where:  { businessId, conversationId },
      order:  { createdAt: 'DESC' },
      skip:   (page - 1) * limit,
      take:   limit,
    });
    return { items: items.reverse(), total, page, limit };
  }

  // ── Send text message ──────────────────────────────────────────────────────
  async sendText(businessId: string, userId: string, dto: {
    conversationId: string;
    content:        string;
    replyToWaId?:   string;
  }) {
    const { conversation, business } = await this.getConversationAndBusiness(businessId, dto.conversationId);

    this.checkWindowOpen(conversation);

    // Save optimistically
    const msg = this.messages.create({
      businessId,
      conversationId: dto.conversationId,
      contactId:      conversation.contactId,
      direction:      'outbound',
      senderType:     'agent',
      senderId:       userId,
      type:           'text',
      content:        dto.content,
      status:         'pending',
    });
    await this.messages.save(msg);

    // Update conversation
    await this.conversations.update(dto.conversationId, {
      lastMessageAt: new Date(),
    });

    // Queue actual WhatsApp send
    await this.messageQueue.add('send-text', {
      messageId:     msg.id,
      businessId,
      phoneNumberId: business.waPhoneNumberId,
      accessToken:   business.waAccessToken,
      to:            conversation.contact.phone,
      content:       dto.content,
      replyToWaId:   dto.replyToWaId,
    }, { attempts: 3, backoff: { type: 'exponential', delay: 2000 } });

    return msg;
  }

  // ── Send template ──────────────────────────────────────────────────────────
  async sendTemplate(businessId: string, userId: string, dto: {
    conversationId:   string;
    templateName:     string;
    templateLanguage: string;
    components?:      any[];
  }) {
    const { conversation, business } = await this.getConversationAndBusiness(businessId, dto.conversationId);

    const msg = this.messages.create({
      businessId,
      conversationId:   dto.conversationId,
      contactId:        conversation.contactId,
      direction:        'outbound',
      senderType:       'agent',
      senderId:         userId,
      type:             'template',
      templateName:     dto.templateName,
      templateLanguage: dto.templateLanguage,
      templateParams:   dto.components ?? [],
      status:           'pending',
    });
    await this.messages.save(msg);

    await this.messageQueue.add('send-template', {
      messageId:        msg.id,
      businessId,
      phoneNumberId:    business.waPhoneNumberId,
      accessToken:      business.waAccessToken,
      to:               conversation.contact.phone,
      templateName:     dto.templateName,
      templateLanguage: dto.templateLanguage,
      components:       dto.components ?? [],
    }, { attempts: 3, backoff: { type: 'exponential', delay: 2000 } });

    return msg;
  }

  // ── Update message status (called from webhook) ────────────────────────────
  async updateStatus(waMessageId: string, status: string, errorCode?: string, errorMessage?: string) {
    await this.messages.update({ waMessageId }, {
      status:       status as any,
      errorCode,
      errorMessage,
    });
  }

  // ── Helpers ────────────────────────────────────────────────────────────────
  private async getConversationAndBusiness(businessId: string, conversationId: string) {
    const conversation = await this.conversations.findOne({
      where:     { id: conversationId, businessId },
      relations: ['contact'],
    });
    if (!conversation) throw new NotFoundException('Conversation not found');

    const business = await this.businesses.findOne({ where: { id: businessId } });
    if (!business?.waPhoneNumberId) throw new ForbiddenException('WhatsApp not configured');

    return { conversation, business };
  }

  private checkWindowOpen(conversation: Conversation) {
    if (conversation.windowExpiresAt && new Date() > conversation.windowExpiresAt) {
      throw new ForbiddenException('24h messaging window expired. Use a template message.');
    }
  }

  // ── Bot / automation helpers (called by AutomationsService) ───────────────
  async sendTextAsBot(
    business:       Business,
    conversationId: string,
    contact:        any,
    content:        string,
  ) {
    const msg = this.messages.create({
      businessId:     business.id,
      conversationId,
      contactId:      contact.id,
      direction:      'outbound',
      senderType:     'bot',
      type:           'text',
      content,
      status:         'pending',
    });
    await this.messages.save(msg);

    await this.conversations.update(conversationId, { lastMessageAt: new Date() });

    await this.messageQueue.add('send-text', {
      messageId:     msg.id,
      businessId:    business.id,
      phoneNumberId: business.waPhoneNumberId,
      accessToken:   business.waAccessToken,
      to:            contact.phone,
      content,
    }, { attempts: 3, backoff: { type: 'exponential', delay: 2000 } });

    return msg;
  }

  async sendTemplateAsBot(
    business:         Business,
    conversationId:   string,
    contact:          any,
    templateName:     string,
    templateLanguage: string,
    components?:      any[],
  ) {
    const msg = this.messages.create({
      businessId:       business.id,
      conversationId,
      contactId:        contact.id,
      direction:        'outbound',
      senderType:       'bot',
      type:             'template',
      templateName,
      templateLanguage,
      templateParams:   components ?? [],
      status:           'pending',
    });
    await this.messages.save(msg);

    await this.messageQueue.add('send-template', {
      messageId:        msg.id,
      businessId:       business.id,
      phoneNumberId:    business.waPhoneNumberId,
      accessToken:      business.waAccessToken,
      to:               contact.phone,
      templateName,
      templateLanguage,
      components:       components ?? [],
    }, { attempts: 3, backoff: { type: 'exponential', delay: 2000 } });

    return msg;
  }

  async assignConversation(conversationId: string, agentId: string) {
    await this.conversations.update(conversationId, { assignedTo: agentId });
  }

  async resolveConversation(conversationId: string) {
    await this.conversations.update(conversationId, { status: 'resolved' });
  }

  async reopenConversation(conversationId: string) {
    await this.conversations.update(conversationId, { status: 'open' });
  }

  async getConversations(businessId: string, opts: {
    status?:  string;
    agentId?: string;
    page?:    number;
    limit?:   number;
  }) {
    const { status, agentId, page = 1, limit = 30 } = opts;
    const qb = this.conversations.createQueryBuilder('c')
      .leftJoinAndSelect('c.contact', 'contact')
      .where('c.business_id = :businessId', { businessId })
      .orderBy('c.last_message_at', 'DESC', 'NULLS LAST')
      .skip((page - 1) * limit)
      .take(limit);

    if (status)  qb.andWhere('c.status = :status',  { status });
    if (agentId) qb.andWhere('c.assigned_to = :agentId', { agentId });

    const [items, total] = await qb.getManyAndCount();
    return { items, total, page, limit };
  }
}

