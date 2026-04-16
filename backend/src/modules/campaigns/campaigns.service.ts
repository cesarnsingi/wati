// ── campaigns.service.ts ──────────────────────────────────────────────────────
import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository }       from 'typeorm';
import { InjectQueue }      from '@nestjs/bull';
import { Queue }            from 'bull';
import { Campaign }         from './campaign.entity';
import { Contact }          from '../contacts/contact.entity';

@Injectable()
export class CampaignsService {
  constructor(
    @InjectRepository(Campaign) private campaigns: Repository<Campaign>,
    @InjectRepository(Contact)  private contacts:  Repository<Contact>,
    @InjectQueue('campaigns')   private queue:     Queue,
  ) {}

  async list(businessId: string) {
    return this.campaigns.find({
      where: { businessId },
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(businessId: string, id: string) {
    const c = await this.campaigns.findOne({ where: { id, businessId } });
    if (!c) throw new NotFoundException('Campaign not found');
    return c;
  }

  async create(businessId: string, userId: string, dto: Partial<Campaign>) {
    const campaign = this.campaigns.create({
      ...dto,
      businessId,
      createdBy: userId,
      status: 'draft',
    });
    return this.campaigns.save(campaign);
  }

  async update(businessId: string, id: string, dto: Partial<Campaign>) {
    const campaign = await this.findOne(businessId, id);
    if (campaign.status !== 'draft') {
      throw new BadRequestException('Can only edit draft campaigns');
    }
    await this.campaigns.update({ id, businessId }, dto);
    return this.findOne(businessId, id);
  }

  async launch(businessId: string, id: string) {
    const campaign = await this.findOne(businessId, id);
    if (campaign.status !== 'draft') {
      throw new BadRequestException('Campaign is not in draft status');
    }

    // Resolve contacts
    const contacts = await this.resolveContacts(businessId, campaign);
    if (contacts.length === 0) {
      throw new BadRequestException('No contacts match the campaign filter');
    }

    await this.campaigns.update(id, {
      status:         'running',
      startedAt:      new Date(),
      estimatedCount: contacts.length,
    });

    // Queue one job per contact
    const jobs = contacts.map((contact) => ({
      name: 'send-to-contact',
      data: { campaignId: id, contactId: contact.id, businessId },
    }));
    await this.queue.addBulk(jobs.map((j) => ({
      name: j.name,
      data: j.data,
      opts: { attempts: 3, backoff: { type: 'exponential', delay: 2000 }, delay: 0 },
    })));

    return this.findOne(businessId, id);
  }

  async pause(businessId: string, id: string) {
    await this.campaigns.update({ id, businessId }, { status: 'paused' });
    return this.findOne(businessId, id);
  }

  async delete(businessId: string, id: string) {
    const campaign = await this.findOne(businessId, id);
    if (campaign.status === 'running') {
      throw new BadRequestException('Cannot delete a running campaign');
    }
    await this.campaigns.delete({ id, businessId });
  }

  private async resolveContacts(businessId: string, campaign: Campaign): Promise<Contact[]> {
    if (campaign.contactIds?.length) {
      return this.contacts.findByIds(campaign.contactIds);
    }
    const qb = this.contacts.createQueryBuilder('c')
      .where('c.business_id = :businessId', { businessId })
      .andWhere('c.opted_in = true');

    const filter = campaign.contactFilter ?? {};
    if (filter.tags?.length) {
      qb.andWhere('c.tags && :tags', { tags: filter.tags });
    }
    return qb.getMany();
  }
}
