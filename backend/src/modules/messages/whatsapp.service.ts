import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';

export interface SendTextPayload {
  to:      string;   // E.164 phone number
  body:    string;
  replyTo?: string;  // wa_message_id to quote
}

export interface SendTemplatePayload {
  to:           string;
  templateName: string;
  language:     string;             // e.g. "pt_BR"
  components?:  TemplateComponent[];
}

export interface TemplateComponent {
  type:       'header' | 'body' | 'button';
  parameters: TemplateParameter[];
}

export interface TemplateParameter {
  type:  'text' | 'image' | 'document' | 'video';
  text?: string;
  image?: { link: string };
}

export interface SendMediaPayload {
  to:       string;
  type:     'image' | 'video' | 'document' | 'audio';
  mediaUrl: string;
  caption?: string;
  filename?: string;
}

@Injectable()
export class WhatsAppService {
  private readonly logger = new Logger(WhatsAppService.name);
  private readonly baseUrl = 'https://graph.facebook.com/v19.0';

  constructor(private config: ConfigService) {}

  // Build per-tenant axios instance
  private getClient(accessToken: string, phoneNumberId: string): AxiosInstance {
    return axios.create({
      baseURL: `${this.baseUrl}/${phoneNumberId}`,
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });
  }

  // ── Send text message ──────────────────────────────────────────────────────
  async sendText(
    accessToken:   string,
    phoneNumberId: string,
    payload:       SendTextPayload,
  ) {
    const client = this.getClient(accessToken, phoneNumberId);

    const body: any = {
      messaging_product: 'whatsapp',
      recipient_type:    'individual',
      to:                payload.to,
      type:              'text',
      text:              { body: payload.body, preview_url: false },
    };

    if (payload.replyTo) {
      body.context = { message_id: payload.replyTo };
    }

    try {
      const { data } = await client.post('/messages', body);
      return data; // { messages: [{ id: "wamid.xxx" }] }
    } catch (err: any) {
      this.logger.error('sendText failed', err.response?.data);
      throw new BadRequestException(err.response?.data?.error?.message ?? 'WhatsApp send failed');
    }
  }

  // ── Send template message ──────────────────────────────────────────────────
  async sendTemplate(
    accessToken:   string,
    phoneNumberId: string,
    payload:       SendTemplatePayload,
  ) {
    const client = this.getClient(accessToken, phoneNumberId);

    const body = {
      messaging_product: 'whatsapp',
      to:       payload.to,
      type:     'template',
      template: {
        name:       payload.templateName,
        language:   { code: payload.language },
        components: payload.components ?? [],
      },
    };

    try {
      const { data } = await client.post('/messages', body);
      return data;
    } catch (err: any) {
      this.logger.error('sendTemplate failed', err.response?.data);
      throw new BadRequestException(err.response?.data?.error?.message ?? 'Template send failed');
    }
  }

  // ── Send media ─────────────────────────────────────────────────────────────
  async sendMedia(
    accessToken:   string,
    phoneNumberId: string,
    payload:       SendMediaPayload,
  ) {
    const client = this.getClient(accessToken, phoneNumberId);

    const mediaObj: any = { link: payload.mediaUrl };
    if (payload.caption)  mediaObj.caption  = payload.caption;
    if (payload.filename) mediaObj.filename = payload.filename;

    const body = {
      messaging_product: 'whatsapp',
      to:   payload.to,
      type: payload.type,
      [payload.type]: mediaObj,
    };

    try {
      const { data } = await client.post('/messages', body);
      return data;
    } catch (err: any) {
      this.logger.error('sendMedia failed', err.response?.data);
      throw new BadRequestException(err.response?.data?.error?.message ?? 'Media send failed');
    }
  }

  // ── Mark message as read ───────────────────────────────────────────────────
  async markAsRead(
    accessToken:   string,
    phoneNumberId: string,
    waMessageId:   string,
  ) {
    const client = this.getClient(accessToken, phoneNumberId);
    try {
      await client.post('/messages', {
        messaging_product: 'whatsapp',
        status:            'read',
        message_id:        waMessageId,
      });
    } catch {
      // Non-critical — don't throw
    }
  }

  // ── Verify webhook signature ───────────────────────────────────────────────
  verifySignature(payload: string, signature: string, appSecret: string): boolean {
    const crypto = require('crypto');
    const expected = 'sha256=' + crypto
      .createHmac('sha256', appSecret)
      .update(payload)
      .digest('hex');
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
  }

  // ── Get media URL from WhatsApp ────────────────────────────────────────────
  async getMediaUrl(mediaId: string, accessToken: string): Promise<string> {
    try {
      const { data } = await axios.get(`${this.baseUrl}/${mediaId}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      return data.url;
    } catch {
      return '';
    }
  }
}
