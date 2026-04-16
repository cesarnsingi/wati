// ── auth.module.ts ────────────────────────────────────────────────────────────
import { Module }               from '@nestjs/common';
import { JwtModule }            from '@nestjs/jwt';
import { PassportModule }       from '@nestjs/passport';
import { TypeOrmModule }        from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthController }       from './auth.controller';
import { AuthService }          from './auth.service';
import { JwtStrategy }          from './jwt.strategy';
import { User }                 from '../businesses/entities/user.entity';
import { Business }             from '../businesses/entities/business.entity';

@Module({
  imports: [
    PassportModule,
    TypeOrmModule.forFeature([User, Business]),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject:  [ConfigService],
      useFactory: (cfg: ConfigService) => ({
        secret:      cfg.get('JWT_SECRET', 'change-this-secret'),
        signOptions: { expiresIn: cfg.get('JWT_EXPIRES_IN', '7d') },
      }),
    }),
  ],
  controllers: [AuthController],
  providers:   [AuthService, JwtStrategy],
  exports:     [AuthService, JwtModule],
})
export class AuthModule {}
