// ── campaigns.module.ts ───────────────────────────────────────────────────────
import { Module }            from '@nestjs/common';
import { TypeOrmModule }     from '@nestjs/typeorm';
import { BullModule }        from '@nestjs/bull';
import { Campaign }          from './campaign.entity';
import { Contact }           from '../contacts/contact.entity';
import { Business }          from '../businesses/entities/business.entity';
import { Message }           from '../messages/message.entity';
import { CampaignsController } from './campaigns.controller';
import { CampaignsService }  from './campaigns.service';
import { CampaignProcessor } from './campaign.processor';
import { WhatsAppService }   from '../messages/whatsapp.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Campaign, Contact, Business, Message]),
    BullModule.registerQueue({ name: 'campaigns' }),
  ],
  controllers: [CampaignsController],
  providers:   [CampaignsService, CampaignProcessor, WhatsAppService],
})
export class CampaignsModule {}
