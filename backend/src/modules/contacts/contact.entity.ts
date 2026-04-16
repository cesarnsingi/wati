// ── contact.entity.ts ─────────────────────────────────────────────────────────
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Business } from '../businesses/entities/business.entity';

@Entity('contacts')
export class Contact {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ name: 'business_id' }) businessId: string;
  @ManyToOne(() => Business) @JoinColumn({ name: 'business_id' }) business: Business;
  @Column() phone: string;
  @Column({ nullable: true }) name: string;
  @Column({ nullable: true }) email: string;
  @Column({ type: 'text', array: true, default: [] }) tags: string[];
  @Column({ type: 'jsonb', name: 'custom_fields', default: {} }) customFields: Record<string, any>;
  @Column({ nullable: true }) notes: string;
  @Column({ name: 'wa_id', nullable: true }) waId: string;
  @Column({ name: 'opted_in', default: false }) optedIn: boolean;
  @Column({ name: 'opted_in_at', nullable: true }) optedInAt: Date;
  @Column({ name: 'last_seen_at', nullable: true }) lastSeenAt: Date;
  @Column({ name: 'assigned_to', nullable: true }) assignedTo: string;
  @Column({ default: 'open' }) status: string;
  @CreateDateColumn({ name: 'created_at' }) createdAt: Date;
  @UpdateDateColumn({ name: 'updated_at' }) updatedAt: Date;
}
