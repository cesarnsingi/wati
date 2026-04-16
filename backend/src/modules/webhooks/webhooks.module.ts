import { Module }            from '@nestjs/common';
import { TypeOrmModule }     from '@nestjs/typeorm';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { Business }          from '../businesses/entities/business.entity';
import { WebhookEvent }      from './webhook-event.entity';
import { WebhooksController } from './webhooks.controller';
import { WebhooksService }   from './webhooks.service';
import { MessagesModule }    from '../messages/messages.module';
import { AutomationsModule } from '../automations/automations.module';
import { ContactsModule }    from '../contacts/contacts.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Business, WebhookEvent]),
    EventEmitterModule.forRoot(),
    MessagesModule,
    AutomationsModule,
    ContactsModule,
  ],
  controllers: [WebhooksController],
  providers:   [WebhooksService],
})
export class WebhooksModule {}
