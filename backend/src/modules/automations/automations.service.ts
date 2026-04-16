import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository }   from '@nestjs/typeorm';
import { Repository }         from 'typeorm';
import { Automation }         from './automation.entity';
import { AutomationLog }      from './automation-log.entity';
import { Business }           from '../businesses/entities/business.entity';
import { Contact }            from '../contacts/contact.entity';
import { Conversation }       from '../messages/conversation.entity';
import { Message }            from '../messages/message.entity';
import { MessagesService }    from '../messages/messages.service';

@Injectable()
export class AutomationsService {
  private readonly logger = new Logger(AutomationsService.name);

  constructor(
    @InjectRepository(Automation)    private automations: Repository<Automation>,
    @InjectRepository(AutomationLog) private logs:        Repository<AutomationLog>,
    private messagesSvc: MessagesService,
  ) {}

  // ── Check all active automations against an inbound message ───────────────
  async checkTriggers(
    business:     Business,
    contact:      Contact,
    conversation: Conversation,
    message:      Message,
  ) {
    const activeAutomations = await this.automations.find({
      where: { businessId: business.id, isActive: true },
    });

    for (const automation of activeAutomations) {
      const matched = this.matchesTrigger(automation, message, contact);
      if (matched) {
        await this.executeAutomation(automation, business, contact, conversation);
      }
    }
  }

  // ── Trigger matching logic ─────────────────────────────────────────────────
  private matchesTrigger(automation: Automation, message: Message, contact: Contact): boolean {
    switch (automation.triggerType) {

      case 'keyword': {
        const keywords: string[] = automation.triggerConfig?.keywords ?? [];
        const text = message.content?.toLowerCase().trim() ?? '';
        return keywords.some((kw) => text.includes(kw.toLowerCase()));
      }

      case 'first_message': {
        // Only if contact was just created (within last 60 seconds)
        const diff = Date.now() - new Date(contact.createdAt).getTime();
        return diff < 60_000;
      }

      case 'opt_in': {
        return !!contact.optedIn;
      }

      default:
        return false;
    }
  }

  // ── Execute automation actions in order ────────────────────────────────────
  async executeAutomation(
    automation:   Automation,
    business:     Business,
    contact:      Contact,
    conversation: Conversation,
  ) {
    const log = this.logs.create({
      automationId:   automation.id,
      contactId:      contact.id,
      conversationId: conversation.id,
      status:         'started',
      stepsCompleted: 0,
    });
    await this.logs.save(log);

    const actions: any[] = automation.actions ?? [];
    let stepsCompleted = 0;

    try {
      for (const action of actions) {
        // Optional delay
        if (action.delay_seconds > 0) {
          await new Promise((r) => setTimeout(r, action.delay_seconds * 1000));
        }

        await this.executeAction(action, business, contact, conversation);
        stepsCompleted++;
      }

      await this.automations.increment({ id: automation.id }, 'runCount', 1);
      await this.logs.update(log.id, {
        status:         'completed',
        stepsCompleted,
        completedAt:    new Date(),
      });
    } catch (err: any) {
      this.logger.error(`Automation ${automation.id} failed at step ${stepsCompleted}: ${err.message}`);
      await this.logs.update(log.id, {
        status:         'failed',
        stepsCompleted,
        error:          err.message,
        completedAt:    new Date(),
      });
    }
  }

  // ── Individual action handlers ─────────────────────────────────────────────
  private async executeAction(
    action:       any,
    business:     Business,
    contact:      Contact,
    conversation: Conversation,
  ) {
    switch (action.type) {

      case 'send_message':
        // Bot sends a text message
        await this.messagesSvc.sendTextAsBot(
          business,
          conversation.id,
          contact,
          action.content,
        );
        break;

      case 'send_template':
        await this.messagesSvc.sendTemplateAsBot(
          business,
          conversation.id,
          contact,
          action.templateName,
          action.templateLanguage ?? 'pt_BR',
          action.components,
        );
        break;

      case 'assign_agent':
        // Assign conversation to an agent
        await this.messagesSvc.assignConversation(
          conversation.id,
          action.agent_id,
        );
        break;

      case 'add_tag':
        // Add tag to contact (handled by contacts service)
        break;

      case 'resolve_conversation':
        await this.messagesSvc.resolveConversation(conversation.id);
        break;

      default:
        this.logger.warn(`Unknown automation action: ${action.type}`);
    }
  }
}
