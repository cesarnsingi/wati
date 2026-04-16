import { Processor, Process } from '@nestjs/bull';
import { Logger }             from '@nestjs/common';
import { InjectRepository }   from '@nestjs/typeorm';
import { Repository }         from 'typeorm';
import { Job }                from 'bull';
import { Campaign }           from './campaign.entity';
import { Contact }            from '../contacts/contact.entity';
import { Business }           from '../businesses/entities/business.entity';
import { Message }            from '../messages/message.entity';
import { WhatsAppService }    from '../messages/whatsapp.service';

@Processor('campaigns')
export class CampaignProcessor {
  private readonly logger = new Logger(CampaignProcessor.name);

  constructor(
    @InjectRepository(Campaign) private campaigns: Repository<Campaign>,
    @InjectRepository(Contact)  private contacts:  Repository<Contact>,
    @InjectRepository(Business) private businesses: Repository<Business>,
    @InjectRepository(Message)  private messages:  Repository<Message>,
    private wa: WhatsAppService,
  ) {}

  @Process('send-to-contact')
  async handle(job: Job<{ campaignId: string; contactId: string; businessId: string }>) {
    const { campaignId, contactId, businessId } = job.data;

    const [campaign, contact, business] = await Promise.all([
      this.campaigns.findOne({ where: { id: campaignId } }),
      this.contacts.findOne({ where: { id: contactId } }),
      this.businesses.findOne({ where: { id: businessId } }),
    ]);

    if (!campaign || !contact || !business?.waPhoneNumberId) {
      this.logger.warn(`Skipping job — missing data: ${campaignId}`);
      return;
    }

    // Rate limit: ~80 messages/minute max (WhatsApp limit)
    await new Promise((r) => setTimeout(r, 750));

    try {
      const result = await this.wa.sendTemplate(
        business.waAccessToken,
        business.waPhoneNumberId,
        {
          to:           contact.phone,
          templateName: campaign.templateName,
          language:     campaign.templateLanguage,
          components:   campaign.templateParams ?? [],
        },
      );

      // Save message record
      await this.messages.save(this.messages.create({
        businessId,
        contactId,
        direction:        'outbound',
        senderType:       'system',
        type:             'template',
        templateName:     campaign.templateName,
        templateLanguage: campaign.templateLanguage,
        waMessageId:      result?.messages?.[0]?.id,
        status:           'sent',
      }));

      await this.campaigns.increment({ id: campaignId }, 'sentCount', 1);
      this.logger.log(`Campaign ${campaignId} → ${contact.phone} ✓`);

    } catch (err: any) {
      await this.campaigns.increment({ id: campaignId }, 'failedCount', 1);
      this.logger.error(`Campaign ${campaignId} → ${contact.phone} ✗ ${err.message}`);
      throw err;
    }
  }
}
