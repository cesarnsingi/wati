// ── automation-log.entity.ts ──────────────────────────────────────────────────
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('automation_logs')
export class AutomationLog {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ name: 'automation_id' }) automationId: string;
  @Column({ name: 'contact_id' }) contactId: string;
  @Column({ name: 'conversation_id', nullable: true }) conversationId: string;
  @Column() status: string;
  @Column({ name: 'steps_completed', default: 0 }) stepsCompleted: number;
  @Column({ nullable: true, type: 'text' }) error: string;
  @CreateDateColumn({ name: 'started_at' }) startedAt: Date;
  @Column({ name: 'completed_at', nullable: true }) completedAt: Date;
}
