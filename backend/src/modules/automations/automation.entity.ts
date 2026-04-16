// ── automation.entity.ts ─────────────────────────────────────────────────────
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('automations')
export class Automation {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ name: 'business_id' }) businessId: string;
  @Column({ name: 'created_by' }) createdBy: string;
  @Column() name: string;
  @Column({ nullable: true }) description: string;
  @Column({ name: 'is_active', default: true }) isActive: boolean;
  @Column({ name: 'trigger_type' }) triggerType: string;
  @Column({ name: 'trigger_config', type: 'jsonb', default: {} }) triggerConfig: Record<string, any>;
  @Column({ type: 'jsonb', default: [] }) actions: any[];
  @Column({ name: 'run_count', default: 0 }) runCount: number;
  @CreateDateColumn({ name: 'created_at' }) createdAt: Date;
  @UpdateDateColumn({ name: 'updated_at' }) updatedAt: Date;
}
