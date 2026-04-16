import {
  Controller, Get, Post, Query, Body, Headers,
  RawBodyRequest, Req, Param, HttpCode, Logger,
  BadRequestException,
} from '@nestjs/common';
import { Request }          from 'express';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository }       from 'typeorm';
import { Business }         from '../businesses/entities/business.entity';
import { WebhookEvent }     from './webhook-event.entity';
import { WebhooksService }  from './webhooks.service';
import { WhatsAppService }  from '../messages/whatsapp.service';

@Controller('webhooks')
export class WebhooksController {
  private readonly logger = new Logger(WebhooksController.name);

  constructor(
    @InjectRepository(Business)     private businesses:    Repository<Business>,
    @InjectRepository(WebhookEvent) private webhookEvents: Repository<WebhookEvent>,
    private webhooksSvc: WebhooksService,
    private wa:          WhatsAppService,
  ) {}

  // ── Webhook verification (GET) ─────────────────────────────────────────────
  // Meta calls GET /api/v1/webhooks/:businessSlug?hub.mode=subscribe&hub.challenge=xxx&hub.verify_token=xxx
  @Get(':businessSlug')
  async verify(
    @Param('businessSlug') slug:  string,
    @Query('hub.mode')     mode:  string,
    @Query('hub.challenge') challenge: string,
    @Query('hub.verify_token') token:  string,
  ) {
    const business = await this.businesses.findOne({ where: { slug } });
    if (!business) throw new BadRequestException('Business not found');

    if (mode === 'subscribe' && token === business.waVerifyToken) {
      this.logger.log(`Webhook verified for ${slug}`);
      return parseInt(challenge, 10);
    }
    throw new BadRequestException('Verification failed');
  }

  // ── Inbound webhook events (POST) ──────────────────────────────────────────
  @Post(':businessSlug')
  @HttpCode(200)
  async receive(
    @Param('businessSlug')   slug:      string,
    @Body()                  body:      any,
    @Headers('x-hub-signature-256') sig: string,
    @Req()                   req:       RawBodyRequest<Request>,
  ) {
    const business = await this.businesses.findOne({ where: { slug } });
    if (!business) return 'OK'; // Always return 200 to Meta

    // Verify signature if app secret is configured
    if (business.waWebhookSecret && sig) {
      const raw = (req as any).rawBody?.toString() ?? JSON.stringify(body);
      const valid = this.wa.verifySignature(raw, sig, business.waWebhookSecret);
      if (!valid) {
        this.logger.warn(`Invalid signature for ${slug}`);
        return 'OK';
      }
    }

    // Log raw event for debugging
    const event = this.webhookEvents.create({
      businessId: business.id,
      eventType:  body?.entry?.[0]?.changes?.[0]?.field ?? 'unknown',
      payload:    body,
      processed:  false,
    });
    await this.webhookEvents.save(event);

    // Process asynchronously
    this.webhooksSvc.processEvent(business, body, event.id).catch((err) => {
      this.logger.error(`Webhook processing failed: ${err.message}`);
    });

    return 'OK'; // Always return 200 immediately
  }
}
