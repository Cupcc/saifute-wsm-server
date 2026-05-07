import { ValidationPipe } from "@nestjs/common";
import { QueryMonthlyReportingDto } from "./query-reporting.dto";

describe("QueryMonthlyReportingDto", () => {
  const pipe = new ValidationPipe({
    transform: true,
    whitelist: true,
    forbidNonWhitelisted: true,
  });

  it("accepts keyword on monthly reporting summary queries", async () => {
    const result = (await pipe.transform(
      {
        yearMonth: "2026-03",
        viewMode: "MATERIAL_CATEGORY",
        keyword: "化工",
      },
      {
        type: "query",
        metatype: QueryMonthlyReportingDto,
      },
    )) as QueryMonthlyReportingDto;

    expect(result.keyword).toBe("化工");
  });
});
