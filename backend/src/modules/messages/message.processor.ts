import { Processor, Process } from '@nestjs/bull';
import { Logger }             from '@nestjs/common';
import { InjectRepository }   from '@nestjs/typeorm';
import { Repository }         from 'typeorm';
import { Job }                from 'bull';
import { Message }            from './message.entity';
import { WhatsAppService }    from './whatsapp.service';

@Processor('messages')
export class MessageProcessor {
  private readonly logger = new Logger(MessageProcessor.name);

  constructor(
    @InjectRepository(Message) private messages: Repository<Message>,
    private wa: WhatsAppService,
  ) {}

  // ── Process text send ──────────────────────────────────────────────────────
  @Process('send-text')
  async handleSendText(job: Job<{
    messageId:     string;
    businessId:    string;
    phoneNumberId: string;
    accessToken:   string;
    to:            string;
    content:       string;
    replyToWaId?:  string;
  }>) {
    const { messageId, phoneNumberId, accessToken, to, content, replyToWaId } = job.data;
    try {
      const result = await this.wa.sendText(accessToken, phoneNumberId, {
        to, body: content, replyTo: replyToWaId,
      });
      const waId = result?.messages?.[0]?.id;
      await this.messages.update(messageId, { waMessageId: waId, status: 'sent' });
      this.logger.log(`Message ${messageId} sent → ${waId}`);
    } catch (err: any) {
      await this.messages.update(messageId, {
        status:       'failed',
        errorCode:    err?.response?.status?.toString(),
        errorMessage: err?.message,
      });
      this.logger.error(`Message ${messageId} failed: ${err.message}`);
      throw err; // Bull will retry
    }
  }

  // ── Process template send ──────────────────────────────────────────────────
  @Process('send-template')
  async handleSendTemplate(job: Job<{
    messageId:        string;
    phoneNumberId:    string;
    accessToken:      string;
    to:               string;
    templateName:     string;
    templateLanguage: string;
    components:       any[];
  }>) {
    const { messageId, phoneNumberId, accessToken, to, templateName, templateLanguage, components } = job.data;
    try {
      const result = await this.wa.sendTemplate(accessToken, phoneNumberId, {
        to, templateName, language: templateLanguage, components,
      });
      const waId = result?.messages?.[0]?.id;
      await this.messages.update(messageId, { waMessageId: waId, status: 'sent' });
    } catch (err: any) {
      await this.messages.update(messageId, {
        status: 'failed', errorMessage: err?.message,
      });
      throw err;
    }
  }
}
