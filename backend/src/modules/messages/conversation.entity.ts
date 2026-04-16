import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Contact } from '../contacts/contact.entity';

@Entity('conversations')
export class Conversation {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ name: 'business_id' }) businessId: string;
  @Column({ name: 'contact_id' }) contactId: string;
  @ManyToOne(() => Contact) @JoinColumn({ name: 'contact_id' }) contact: Contact;
  @Column({ name: 'assigned_to', nullable: true }) assignedTo: string;
  @Column({ default: 'open' }) status: string;
  @Column({ name: 'last_customer_message_at', nullable: true }) lastCustomerMessageAt: Date;
  @Column({ name: 'window_expires_at', nullable: true }) windowExpiresAt: Date;
  @Column({ name: 'unread_count', default: 0 }) unreadCount: number;
  @Column({ name: 'last_message_at', nullable: true }) lastMessageAt: Date;
  @CreateDateColumn({ name: 'created_at' }) createdAt: Date;
  @UpdateDateColumn({ name: 'updated_at' }) updatedAt: Date;
}
