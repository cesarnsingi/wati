// ── auth.service.ts ───────────────────────────────────────────────────────────
import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository }       from 'typeorm';
import { JwtService }       from '@nestjs/jwt';
import * as bcrypt          from 'bcryptjs';
import { User }             from '../businesses/entities/user.entity';
import { Business }         from '../businesses/entities/business.entity';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)     private users: Repository<User>,
    @InjectRepository(Business) private businesses: Repository<Business>,
    private jwt: JwtService,
  ) {}

  async register(dto: {
    businessName: string;
    email:        string;
    password:     string;
    fullName:     string;
  }) {
    // Check email not taken globally
    const existing = await this.users.findOne({ where: { email: dto.email } });
    if (existing) throw new ConflictException('Email already registered');

    // Create business
    const slug = dto.businessName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') + '-' + Date.now();
    const business = this.businesses.create({ name: dto.businessName, slug });
    await this.businesses.save(business);

    // Create owner user
    const hash = await bcrypt.hash(dto.password, 12);
    const user = this.users.create({
      businessId:   business.id,
      email:        dto.email,
      passwordHash: hash,
      fullName:     dto.fullName,
      role:         'owner',
    });
    await this.users.save(user);

    return this.signToken(user, business);
  }

  async login(email: string, password: string) {
    const user = await this.users.findOne({
      where:    { email, isActive: true },
      relations: ['business'],
    });
    if (!user) throw new UnauthorizedException('Invalid credentials');

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) throw new UnauthorizedException('Invalid credentials');

    user.lastLoginAt = new Date();
    await this.users.save(user);

    return this.signToken(user, user.business);
  }

  private signToken(user: User, business: Business) {
    const payload = {
      sub:        user.id,
      email:      user.email,
      businessId: business.id,
      role:       user.role,
    };
    return {
      access_token: this.jwt.sign(payload),
      user: {
        id:         user.id,
        email:      user.email,
        fullName:   user.fullName,
        role:       user.role,
        businessId: business.id,
        businessName: business.name,
      },
    };
  }
}
