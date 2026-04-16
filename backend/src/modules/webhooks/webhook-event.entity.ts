import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('webhook_events')
export class WebhookEvent {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ name: 'business_id', nullable: true }) businessId: string;
  @Column({ name: 'event_type' }) eventType: string;
  @Column({ type: 'jsonb' }) payload: any;
  @Column({ default: false }) processed: boolean;
  @Column({ nullable: true, type: 'text' }) error: string;
  @CreateDateColumn({ name: 'received_at' }) receivedAt: Date;
  @Column({ name: 'processed_at', nullable: true }) processedAt: Date;
}
