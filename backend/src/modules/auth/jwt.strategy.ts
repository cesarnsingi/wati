// ── jwt.strategy.ts ───────────────────────────────────────────────────────────
import { Injectable }        from '@nestjs/common';
import { PassportStrategy }  from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService }     from '@nestjs/config';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(cfg: ConfigService) {
    super({
      jwtFromRequest:   ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey:      cfg.get('JWT_SECRET', 'change-this-secret'),
    });
  }

  async validate(payload: any) {
    return {
      userId:     payload.sub,
      email:      payload.email,
      businessId: payload.businessId,
      role:       payload.role,
    };
  }
}
