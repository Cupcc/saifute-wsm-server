import { IsString, IsUUID, Length, MinLength } from "class-validator";

export class LoginDto {
  /** 登录用户名 */
  @IsString()
  @Length(1, 32)
  username!: string;

  /** 登录密码，至少 6 位 */
  @IsString()
  @MinLength(6)
  password!: string;

  /** 图形验证码 ID */
  @IsUUID()
  captchaId!: string;

  /** 4 位图形验证码 */
  @IsString()
  @Length(4, 4)
  captchaCode!: string;
}
