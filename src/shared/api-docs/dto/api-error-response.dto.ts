import { ApiProperty } from "@nestjs/swagger";

export class ApiErrorResponseDto {
  @ApiProperty({
    description: "请求是否成功。错误响应固定为 false。",
    example: false,
  })
  success!: false;

  @ApiProperty({
    description: "HTTP 状态码。",
    example: 400,
  })
  code!: number;

  @ApiProperty({
    description: "面向调用方的错误信息。",
    example: "请求失败",
  })
  message!: string;
}
