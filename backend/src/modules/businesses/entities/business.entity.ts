// ── business.entity.ts ────────────────────────────────────────────────────────
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';

@Entity('businesses')
export class Business {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column() name: string;
  @Column({ unique: true }) slug: string;
  @Column({ default: 'free' }) plan: string;
  @Column({ name: 'wa_phone_number_id', nullable: true }) waPhoneNumberId: string;
  @Column({ name: 'wa_business_account_id', nullable: true }) waBusinessAccountId: string;
  @Column({ name: 'wa_access_token', nullable: true }) waAccessToken: string;
  @Column({ name: 'wa_verify_token' }) waVerifyToken: string;
  @Column({ name: 'wa_webhook_secret', nullable: true }) waWebhookSecret: string;
  @Column({ name: 'monthly_message_limit', default: 1000 }) monthlyMessageLimit: number;
  @Column({ name: 'messages_sent_this_month', default: 0 }) messagesSentThisMonth: number;
  @Column({ name: 'is_active', default: true }) isActive: boolean;
  @Column({ default: 'Africa/Luanda' }) timezone: string;
  @CreateDateColumn({ name: 'created_at' }) createdAt: Date;
  @UpdateDateColumn({ name: 'updated_at' }) updatedAt: Date;
}
