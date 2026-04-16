// ── businesses.service.ts ─────────────────────────────────────────────────────
import { Injectable }       from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository }       from 'typeorm';
import { Business }         from './entities/business.entity';

@Injectable()
export class BusinessesService {
  constructor(@InjectRepository(Business) private repo: Repository<Business>) {}

  findById(id: string) { return this.repo.findOne({ where: { id } }); }

  async updateWhatsApp(id: string, dto: {
    waPhoneNumberId?:    string;
    waAccessToken?:      string;
    waWebhookSecret?:    string;
  }) {
    await this.repo.update(id, dto);
    return this.findById(id);
  }

  async getStats(id: string) {
    return this.repo.findOne({ where: { id }, select: ['monthlyMessageLimit', 'messagesSentThisMonth'] });
  }
}
