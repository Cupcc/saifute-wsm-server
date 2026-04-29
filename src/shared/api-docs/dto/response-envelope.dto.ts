import { ApiProperty } from "@nestjs/swagger";

export class ResponseEnvelopeDto<TData = unknown> {
  @ApiProperty({
    description: "请求是否成功。成功响应固定为 true。",
    example: true,
  })
  success!: true;

  @ApiProperty({
    description: "业务响应码。当前运行时成功响应固定为 200。",
    example: 200,
  })
  code!: number;

  @ApiProperty({
    description: "业务数据。具体结构由接口响应 DTO 定义。",
    type: "object",
    additionalProperties: true,
  })
  data!: TData;
}
