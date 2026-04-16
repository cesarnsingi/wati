import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('campaigns')
export class Campaign {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ name: 'business_id' }) businessId: string;
  @Column({ name: 'created_by' }) createdBy: string;
  @Column() name: string;
  @Column({ default: 'draft' }) status: string;
  @Column({ name: 'template_name' }) templateName: string;
  @Column({ name: 'template_language', default: 'pt' }) templateLanguage: string;
  @Column({ name: 'template_params', type: 'jsonb', default: [] }) templateParams: any[];
  @Column({ name: 'contact_filter', type: 'jsonb', default: {} }) contactFilter: Record<string, any>;
  @Column({ name: 'contact_ids', type: 'uuid', array: true, nullable: true }) contactIds: string[];
  @Column({ name: 'estimated_count', nullable: true }) estimatedCount: number;
  @Column({ name: 'sent_count', default: 0 }) sentCount: number;
  @Column({ name: 'delivered_count', default: 0 }) deliveredCount: number;
  @Column({ name: 'read_count', default: 0 }) readCount: number;
  @Column({ name: 'failed_count', default: 0 }) failedCount: number;
  @Column({ name: 'scheduled_at', nullable: true }) scheduledAt: Date;
  @Column({ name: 'started_at', nullable: true }) startedAt: Date;
  @Column({ name: 'completed_at', nullable: true }) completedAt: Date;
  @CreateDateColumn({ name: 'created_at' }) createdAt: Date;
  @UpdateDateColumn({ name: 'updated_at' }) updatedAt: Date;
}
