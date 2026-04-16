import { Controller, Post, Body, HttpCode } from '@nestjs/common';
import { IsEmail, IsString, MinLength }    from 'class-validator';
import { AuthService }                     from './auth.service';

class RegisterDto {
  @IsString() businessName: string;
  @IsEmail()  email:        string;
  @IsString() @MinLength(8) password: string;
  @IsString() fullName:     string;
}

class LoginDto {
  @IsEmail()  email:    string;
  @IsString() password: string;
}

@Controller('auth')
export class AuthController {
  constructor(private auth: AuthService) {}

  @Post('register')
  register(@Body() dto: RegisterDto) {
    return this.auth.register(dto);
  }

  @Post('login')
  @HttpCode(200)
  login(@Body() dto: LoginDto) {
    return this.auth.login(dto.email, dto.password);
  }
}
