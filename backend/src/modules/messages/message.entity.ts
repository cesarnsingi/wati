import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Conversation } from './conversation.entity';

@Entity('messages')
export class Message {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ name: 'business_id' }) businessId: string;
  @Column({ name: 'conversation_id' }) conversationId: string;
  @ManyToOne(() => Conversation) @JoinColumn({ name: 'conversation_id' }) conversation: Conversation;
  @Column({ name: 'contact_id' }) contactId: string;
  @Column() direction: string;
  @Column({ name: 'sender_type' }) senderType: string;
  @Column({ name: 'sender_id', nullable: true }) senderId: string;
  @Column({ default: 'text' }) type: string;
  @Column({ nullable: true, type: 'text' }) content: string;
  @Column({ name: 'media_url', nullable: true }) mediaUrl: string;
  @Column({ name: 'media_mime_type', nullable: true }) mediaMimeType: string;
  @Column({ name: 'media_filename', nullable: true }) mediaFilename: string;
  @Column({ nullable: true }) caption: string;
  @Column({ name: 'template_name', nullable: true }) templateName: string;
  @Column({ name: 'template_language', nullable: true }) templateLanguage: string;
  @Column({ name: 'template_params', type: 'jsonb', nullable: true }) templateParams: any;
  @Column({ name: 'wa_message_id', nullable: true, unique: true }) waMessageId: string;
  @Column({ name: 'wa_timestamp', nullable: true }) waTimestamp: Date;
  @Column({ default: 'pending' }) status: string;
  @Column({ name: 'error_code', nullable: true }) errorCode: string;
  @Column({ name: 'error_message', nullable: true }) errorMessage: string;
  @Column({ name: 'reply_to_message_id', nullable: true }) replyToMessageId: string;
  @CreateDateColumn({ name: 'created_at' }) createdAt: Date;
}
