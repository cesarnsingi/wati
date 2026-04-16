import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { IsString, IsOptional, IsEmail } from 'class-validator';
import { JwtAuthGuard }    from '../auth/jwt-auth.guard';
import { ContactsService } from './contacts.service';

class CreateContactDto {
  @IsString() phone: string;
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsEmail() email?: string;
  @IsOptional() tags?: string[];
  @IsOptional() customFields?: Record<string, any>;
}

class UpdateContactDto {
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsEmail() email?: string;
  @IsOptional() tags?: string[];
  @IsOptional() customFields?: Record<string, any>;
  @IsOptional() notes?: string;
}

@Controller('contacts')
@UseGuards(JwtAuthGuard)
export class ContactsController {
  constructor(private svc: ContactsService) {}

  @Get()
  list(
    @Request() req,
    @Query('search') search?: string,
    @Query('tag')    tag?:    string,
    @Query('page')   page?:   number,
    @Query('limit')  limit?:  number,
  ) {
    return this.svc.list(req.user.businessId, { search, tag, page: +page, limit: +limit });
  }

  @Get('tags')
  tags(@Request() req) {
    return this.svc.getAllTags(req.user.businessId);
  }

  @Get(':id')
  findOne(@Request() req, @Param('id') id: string) {
    return this.svc.findOne(req.user.businessId, id);
  }

  @Post()
  create(@Request() req, @Body() dto: CreateContactDto) {
    return this.svc.create(req.user.businessId, dto);
  }

  @Patch(':id')
  update(@Request() req, @Param('id') id: string, @Body() dto: UpdateContactDto) {
    return this.svc.update(req.user.businessId, id, dto);
  }

  @Post(':id/tags')
  addTag(@Request() req, @Param('id') id: string, @Body('tag') tag: string) {
    return this.svc.addTag(req.user.businessId, id, tag);
  }

  @Delete(':id/tags/:tag')
  removeTag(@Request() req, @Param('id') id: string, @Param('tag') tag: string) {
    return this.svc.removeTag(req.user.businessId, id, tag);
  }

  @Delete(':id')
  delete(@Request() req, @Param('id') id: string) {
    return this.svc.delete(req.user.businessId, id);
  }
}
