// ── businesses.module.ts ──────────────────────────────────────────────────────
// businesses/businesses.module.ts
import { Module }            from '@nestjs/common';
import { TypeOrmModule }     from '@nestjs/typeorm';
import { Business }          from './entities/business.entity';
import { User }              from './entities/user.entity';
import { BusinessesController } from './businesses.controller';
import { BusinessesService } from './businesses.service';

@Module({
  imports:     [TypeOrmModule.forFeature([Business, User])],
  controllers: [BusinessesController],
  providers:   [BusinessesService],
  exports:     [BusinessesService, TypeOrmModule],
})
export class BusinessesModule {}
