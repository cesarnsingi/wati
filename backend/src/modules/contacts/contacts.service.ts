import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like, ILike } from 'typeorm';
import { Contact } from './contact.entity';

@Injectable()
export class ContactsService {
  constructor(@InjectRepository(Contact) private repo: Repository<Contact>) {}

  async list(businessId: string, opts: {
    search?: string; tag?: string; page?: number; limit?: number;
  }) {
    const { search, tag, page = 1, limit = 50 } = opts;
    const qb = this.repo.createQueryBuilder('c')
      .where('c.business_id = :businessId', { businessId })
      .orderBy('c.created_at', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    if (search) {
      qb.andWhere('(c.name ILIKE :s OR c.phone ILIKE :s OR c.email ILIKE :s)', { s: `%${search}%` });
    }
    if (tag) {
      qb.andWhere(':tag = ANY(c.tags)', { tag });
    }

    const [items, total] = await qb.getManyAndCount();
    return { items, total, page, limit };
  }

  async findOne(businessId: string, id: string) {
    const c = await this.repo.findOne({ where: { id, businessId } });
    if (!c) throw new NotFoundException('Contact not found');
    return c;
  }

  async create(businessId: string, dto: Partial<Contact>) {
    const contact = this.repo.create({ ...dto, businessId });
    return this.repo.save(contact);
  }

  async update(businessId: string, id: string, dto: Partial<Contact>) {
    await this.findOne(businessId, id);
    await this.repo.update({ id, businessId }, dto);
    return this.findOne(businessId, id);
  }

  async addTag(businessId: string, id: string, tag: string) {
    const contact = await this.findOne(businessId, id);
    if (!contact.tags.includes(tag)) {
      contact.tags = [...contact.tags, tag];
      await this.repo.save(contact);
    }
    return contact;
  }

  async removeTag(businessId: string, id: string, tag: string) {
    const contact = await this.findOne(businessId, id);
    contact.tags = contact.tags.filter((t) => t !== tag);
    return this.repo.save(contact);
  }

  async delete(businessId: string, id: string) {
    await this.findOne(businessId, id);
    await this.repo.delete({ id, businessId });
  }

  async getAllTags(businessId: string): Promise<string[]> {
    const result = await this.repo.query(
      `SELECT DISTINCT unnest(tags) AS tag FROM contacts WHERE business_id = $1 ORDER BY tag`,
      [businessId],
    );
    return result.map((r: any) => r.tag);
  }
}
