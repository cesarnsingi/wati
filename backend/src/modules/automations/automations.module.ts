// ── automations.module.ts ─────────────────────────────────────────────────────
import { Module }             from '@nestjs/common';
import { TypeOrmModule }      from '@nestjs/typeorm';
import { Automation }         from './automation.entity';
import { AutomationLog }      from './automation-log.entity';
import { AutomationsController } from './automations.controller';
import { AutomationsService } from './automations.service';
import { MessagesModule }     from '../messages/messages.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Automation, AutomationLog]),
    MessagesModule,
  ],
  controllers: [AutomationsController],
  providers:   [AutomationsService],
  exports:     [AutomationsService],
})
export class AutomationsModule {}
