import { Module, Controller, Get } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule }        from '@nestjs/typeorm';
import { BullModule }           from '@nestjs/bull';
import { ThrottlerModule }      from '@nestjs/throttler';
import { EventEmitterModule }   from '@nestjs/event-emitter';
import { AuthModule }           from './modules/auth/auth.module';
import { BusinessesModule }     from './modules/businesses/businesses.module';
import { ContactsModule }       from './modules/contacts/contacts.module';
import { MessagesModule }       from './modules/messages/messages.module';
import { CampaignsModule }      from './modules/campaigns/campaigns.module';
import { AutomationsModule }    from './modules/automations/automations.module';
import { WebhooksModule }       from './modules/webhooks/webhooks.module';

@Controller()
class HealthController {
  @Get('health') health() { return { status: 'ok', timestamp: new Date().toISOString() }; }
}

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: '.env' }),

    EventEmitterModule.forRoot(),

    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (cfg: ConfigService) => ({
        type:               'postgres',
        host:               cfg.get('DB_HOST', 'localhost'),
        port:               cfg.get<number>('DB_PORT', 5432),
        username:           cfg.get('DB_USER', 'postgres'),
        password:           cfg.get('DB_PASS', 'postgres'),
        database:           cfg.get('DB_NAME', 'wati_angola'),
        entities:           [__dirname + '/**/*.entity{.ts,.js}'],
        synchronize:        cfg.get('NODE_ENV') !== 'production',
        logging:            cfg.get('NODE_ENV') === 'development',
        ssl:                cfg.get('DB_SSL') === 'true' ? { rejectUnauthorized: false } : false,
      }),
    }),

    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (cfg: ConfigService) => ({
        redis: {
          host:     cfg.get('REDIS_HOST', 'localhost'),
          port:     cfg.get<number>('REDIS_PORT', 6379),
          password: cfg.get('REDIS_PASS'),
        },
      }),
    }),

    ThrottlerModule.forRoot([{ ttl: 60000, limit: 100 }]),

    AuthModule,
    BusinessesModule,
    ContactsModule,
    MessagesModule,
    CampaignsModule,
    AutomationsModule,
    WebhooksModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
