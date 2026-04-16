import { Module }            from '@nestjs/common';
import { TypeOrmModule }     from '@nestjs/typeorm';
import { BullModule }        from '@nestjs/bull';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { Message }           from './message.entity';
import { Conversation }      from './conversation.entity';
import { Business }          from '../businesses/entities/business.entity';
import { MessagesController }      from './messages.controller';
import { ConversationsController } from './conversations.controller';
import { MessagesService }   from './messages.service';
import { MessageProcessor }  from './message.processor';
import { WhatsAppService }   from './whatsapp.service';
import { MessagesGateway }   from './messages.gateway';

@Module({
  imports: [
    TypeOrmModule.forFeature([Message, Conversation, Business]),
    BullModule.registerQueue({ name: 'messages' }),
    EventEmitterModule.forRoot(),
  ],
  controllers: [MessagesController, ConversationsController],
  providers:   [MessagesService, MessageProcessor, WhatsAppService, MessagesGateway],
  exports:     [MessagesService, WhatsAppService, TypeOrmModule],
})
export class MessagesModule {}
