import { Injectable, Logger }  from '@nestjs/common';
import { InjectRepository }    from '@nestjs/typeorm';
import { Repository }          from 'typeorm';
import { EventEmitter2 }       from '@nestjs/event-emitter';
import { Business }            from '../businesses/entities/business.entity';
import { Contact }             from '../contacts/contact.entity';
import { Conversation }        from '../messages/conversation.entity';
import { Message }             from '../messages/message.entity';
import { WebhookEvent }        from './webhook-event.entity';
import { MessagesService }     from '../messages/messages.service';
import { AutomationsService }  from '../automations/automations.service';

@Injectable()
export class WebhooksService {
  private readonly logger = new Logger(WebhooksService.name);

  constructor(
    @InjectRepository(Contact)      private contacts:      Repository<Contact>,
    @InjectRepository(Conversation) private conversations: Repository<Conversation>,
    @InjectRepository(Message)      private messages:      Repository<Message>,
    @InjectRepository(WebhookEvent) private events:        Repository<WebhookEvent>,
    private messagesSvc:    MessagesService,
    private automationsSvc: AutomationsService,
    private emitter:        EventEmitter2,
  ) {}

  async processEvent(business: Business, payload: any, eventId: string) {
    try {
      const entry = payload?.entry?.[0];
      const changes = entry?.changes ?? [];

      for (const change of changes) {
        if (change.field !== 'messages') continue;
        const value = change.value;

        // ── Inbound messages ──────────────────────────────────────────────
        for (const msg of value?.messages ?? []) {
          await this.handleInboundMessage(business, msg, value?.contacts?.[0]);
        }

        // ── Status updates ────────────────────────────────────────────────
        for (const status of value?.statuses ?? []) {
          await this.handleStatusUpdate(status);
        }
      }

      await this.events.update(eventId, { processed: true, processedAt: new Date() });
    } catch (err: any) {
      await this.events.update(eventId, { processed: false, error: err.message });
      throw err;
    }
  }

  private async handleInboundMessage(business: Business, waMsg: any, waContact: any) {
    const phone = waMsg.from; // E.164

    // Upsert contact
    let contact = await this.contacts.findOne({
      where: { businessId: business.id, phone },
    });
    if (!contact) {
      contact = this.contacts.create({
        businessId: business.id,
        phone,
        name:      waContact?.profile?.name ?? phone,
        waId:      waContact?.wa_id ?? phone,
        optedIn:   true,
        optedInAt: new Date(),
      });
      await this.contacts.save(contact);
    }

    // Upsert conversation
    let conversation = await this.conversations.findOne({
      where: { businessId: business.id, contactId: contact.id, status: 'open' },
    });
    if (!conversation) {
      conversation = this.conversations.create({
        businessId: business.id,
        contactId:  contact.id,
        status:     'open',
      });
    }

    // Refresh 24h window
    conversation.lastCustomerMessageAt = new Date();
    conversation.windowExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    conversation.lastMessageAt   = new Date();
    conversation.unreadCount     = (conversation.unreadCount ?? 0) + 1;
    await this.conversations.save(conversation);

    // Save message
    const message = this.messages.create({
      businessId:     business.id,
      conversationId: conversation.id,
      contactId:      contact.id,
      direction:      'inbound',
      senderType:     'contact',
      type:           this.mapMsgType(waMsg.type),
      content:        waMsg.text?.body ?? waMsg.caption,
      waMessageId:    waMsg.id,
      waTimestamp:    new Date(parseInt(waMsg.timestamp) * 1000),
      status:         'delivered',
    });
    await this.messages.save(message);

    // Emit real-time event (Socket.io picks this up)
    this.emitter.emit('message.inbound', {
      businessId:   business.id,
      conversation,
      message,
      contact,
    });

    // Trigger automations
    await this.automationsSvc.checkTriggers(business, contact, conversation, message);
  }

  private async handleStatusUpdate(status: any) {
    const { id, status: newStatus, errors } = status;
    const error = errors?.[0];
    await this.messagesSvc.updateStatus(
      id, newStatus,
      error?.code?.toString(),
      error?.title,
    );
  }

  private mapMsgType(type: string): string {
    const map: Record<string, string> = {
      text: 'text', image: 'image', video: 'video',
      audio: 'audio', document: 'document', location: 'location',
      sticker: 'sticker', reaction: 'reaction',
    };
    return map[type] ?? 'unsupported';
  }
}
