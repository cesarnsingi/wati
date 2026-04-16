import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Business } from './business.entity';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ name: 'business_id' }) businessId: string;
  @ManyToOne(() => Business) @JoinColumn({ name: 'business_id' }) business: Business;
  @Column({ unique: false }) email: string;
  @Column({ name: 'password_hash' }) passwordHash: string;
  @Column({ name: 'full_name' }) fullName: string;
  @Column({ default: 'agent' }) role: string;
  @Column({ name: 'avatar_url', nullable: true }) avatarUrl: string;
  @Column({ name: 'is_active', default: true }) isActive: boolean;
  @Column({ name: 'last_login_at', nullable: true }) lastLoginAt: Date;
  @CreateDateColumn({ name: 'created_at' }) createdAt: Date;
  @UpdateDateColumn({ name: 'updated_at' }) updatedAt: Date;
}
