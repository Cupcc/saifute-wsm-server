/* eslint-disable */
export default async () => {
  const t = {
    ["./modules/reporting/dto/query-reporting.dto"]: await import(
      "./modules/reporting/dto/query-reporting.dto"
    ),
    ["./modules/inbound/dto/create-inbound-order-line.dto"]: await import(
      "./modules/inbound/dto/create-inbound-order-line.dto"
    ),
    ["./modules/inbound/dto/update-inbound-order-line.dto"]: await import(
      "./modules/inbound/dto/update-inbound-order-line.dto"
    ),
    ["./modules/outbound/dto/create-outbound-order-line.dto"]: await import(
      "./modules/outbound/dto/create-outbound-order-line.dto"
    ),
    ["./modules/outbound/dto/create-sales-return-line.dto"]: await import(
      "./modules/outbound/dto/create-sales-return-line.dto"
    ),
    ["./modules/outbound/dto/update-outbound-order-line.dto"]: await import(
      "./modules/outbound/dto/update-outbound-order-line.dto"
    ),
    ["./modules/project/dto/create-project-line.dto"]: await import(
      "./modules/project/dto/create-project-line.dto"
    ),
    ["./modules/project/dto/update-project-line.dto"]: await import(
      "./modules/project/dto/update-project-line.dto"
    ),
    ["./modules/workshop-material/dto/create-workshop-material-order-line.dto"]:
      await import(
        "./modules/workshop-material/dto/create-workshop-material-order-line.dto"
      ),
  };
  return {
    "@nestjs/swagger": {
      models: [
        [
          import("./modules/audit-log/dto/query-login-logs.dto"),
          {
            QueryLoginLogsDto: {
              username: { required: false, type: () => String, maxLength: 64 },
              action: { required: false, type: () => Object },
              result: { required: false, type: () => Object },
              limit: {
                required: false,
                type: () => Number,
                default: 50,
                minimum: 1,
              },
              offset: {
                required: false,
                type: () => Number,
                default: 0,
                minimum: 0,
              },
            },
          },
        ],
        [
          import("./modules/audit-log/dto/query-oper-logs.dto"),
          {
            QueryOperLogsDto: {
              title: { required: false, type: () => String, maxLength: 128 },
              operatorName: {
                required: false,
                type: () => String,
                maxLength: 64,
              },
              result: { required: false, type: () => Object },
              limit: {
                required: false,
                type: () => Number,
                default: 50,
                minimum: 1,
              },
              offset: {
                required: false,
                type: () => Number,
                default: 0,
                minimum: 0,
              },
            },
          },
        ],
        [
          import("./modules/master-data/dto/create-material.dto"),
          {
            CreateMaterialDto: {
              materialCode: {
                required: true,
                type: () => String,
                maxLength: 64,
              },
              materialName: {
                required: true,
                type: () => String,
                maxLength: 128,
              },
              specModel: {
                required: false,
                type: () => String,
                maxLength: 128,
              },
              categoryId: { required: false, type: () => Number },
              unitCode: { required: true, type: () => String, maxLength: 32 },
              warningMinQty: {
                required: false,
                type: () => String,
                pattern: "/^\\d+(\\.\\d{1,6})?$/",
              },
              warningMaxQty: {
                required: false,
                type: () => String,
                pattern: "/^\\d+(\\.\\d{1,6})?$/",
              },
            },
          },
        ],
        [
          import("./modules/master-data/dto/query-master-data.dto"),
          {
            QueryMasterDataDto: {
              keyword: { required: false, type: () => String, maxLength: 64 },
              limit: {
                required: false,
                type: () => Number,
                default: 50,
                minimum: 1,
              },
              offset: {
                required: false,
                type: () => Number,
                default: 0,
                minimum: 0,
              },
            },
          },
        ],
        [
          import("./modules/master-data/dto/update-material.dto"),
          {
            UpdateMaterialDto: {
              materialName: {
                required: false,
                type: () => String,
                maxLength: 128,
              },
              specModel: {
                required: false,
                type: () => String,
                maxLength: 128,
              },
              categoryId: { required: false, type: () => Number },
              unitCode: { required: false, type: () => String, maxLength: 32 },
              warningMinQty: {
                required: false,
                type: () => String,
                pattern: "/^\\d+(\\.\\d{1,6})?$/",
              },
              warningMaxQty: {
                required: false,
                type: () => String,
                pattern: "/^\\d+(\\.\\d{1,6})?$/",
              },
            },
          },
        ],
        [
          import("./modules/inventory-core/dto/query-inventory.dto"),
          {
            QueryInventoryBalancesDto: {
              materialId: { required: false, type: () => Number, minimum: 1 },
              workshopId: { required: false, type: () => Number, minimum: 1 },
              limit: {
                required: false,
                type: () => Number,
                default: 50,
                minimum: 1,
              },
              offset: {
                required: false,
                type: () => Number,
                default: 0,
                minimum: 0,
              },
            },
            QueryInventoryLogsDto: {
              materialId: { required: false, type: () => Number, minimum: 1 },
              workshopId: { required: false, type: () => Number, minimum: 1 },
              businessDocumentId: {
                required: false,
                type: () => Number,
                minimum: 1,
              },
              businessDocumentType: { required: false, type: () => String },
              limit: {
                required: false,
                type: () => Number,
                default: 50,
                minimum: 1,
              },
              offset: {
                required: false,
                type: () => Number,
                default: 0,
                minimum: 0,
              },
            },
            QueryInventorySourceUsagesDto: {
              materialId: { required: false, type: () => Number, minimum: 1 },
              consumerDocumentType: { required: false, type: () => String },
              consumerDocumentId: {
                required: false,
                type: () => Number,
                minimum: 1,
              },
              limit: {
                required: false,
                type: () => Number,
                default: 50,
                minimum: 1,
              },
              offset: {
                required: false,
                type: () => Number,
                default: 0,
                minimum: 0,
              },
            },
          },
        ],
        [
          import("./modules/reporting/dto/query-reporting.dto"),
          {
            QueryInventorySummaryDto: {
              keyword: {
                required: false,
                type: () => String,
                description:
                  "\u7269\u6599\u7F16\u7801\u6216\u540D\u79F0\u5173\u952E\u5B57",
                maxLength: 128,
              },
              categoryId: {
                required: false,
                type: () => Number,
                description: "\u7269\u6599\u5206\u7C7B ID",
                minimum: 1,
              },
              workshopId: {
                required: false,
                type: () => Number,
                description: "\u8F66\u95F4 ID",
                minimum: 1,
              },
              limit: {
                required: false,
                type: () => Number,
                description: "\u6BCF\u9875\u6761\u6570\uFF0C\u9ED8\u8BA4 50",
                default: 50,
                minimum: 1,
              },
              offset: {
                required: false,
                type: () => Number,
                description:
                  "\u5206\u9875\u504F\u79FB\u91CF\uFF0C\u4ECE 0 \u5F00\u59CB",
                default: 0,
                minimum: 0,
              },
            },
            QueryMaterialCategorySummaryDto: {
              keyword: {
                required: false,
                type: () => String,
                description: "\u5206\u7C7B\u540D\u79F0\u5173\u952E\u5B57",
                maxLength: 128,
              },
              workshopId: {
                required: false,
                type: () => Number,
                description: "\u8F66\u95F4 ID",
                minimum: 1,
              },
              limit: {
                required: false,
                type: () => Number,
                description: "\u6BCF\u9875\u6761\u6570\uFF0C\u9ED8\u8BA4 50",
                default: 50,
                minimum: 1,
              },
              offset: {
                required: false,
                type: () => Number,
                description:
                  "\u5206\u9875\u504F\u79FB\u91CF\uFF0C\u4ECE 0 \u5F00\u59CB",
                default: 0,
                minimum: 0,
              },
            },
            QueryTrendSeriesDto: {
              trendType: {
                required: false,
                description: "\u8D8B\u52BF\u56FE\u7EDF\u8BA1\u7C7B\u578B",
                enum: t["./modules/reporting/dto/query-reporting.dto"]
                  .ReportingTrendType,
              },
              dateFrom: {
                required: false,
                type: () => String,
                description:
                  "\u5F00\u59CB\u65E5\u671F\uFF0C\u683C\u5F0F\u4E3A YYYY-MM-DD",
              },
              dateTo: {
                required: false,
                type: () => String,
                description:
                  "\u7ED3\u675F\u65E5\u671F\uFF0C\u683C\u5F0F\u4E3A YYYY-MM-DD",
              },
            },
            ExportReportDto: {
              reportType: {
                required: true,
                description: "\u5BFC\u51FA\u7684\u62A5\u8868\u7C7B\u578B",
                enum: t["./modules/reporting/dto/query-reporting.dto"]
                  .ReportingExportType,
              },
              keyword: {
                required: false,
                type: () => String,
                description: "\u5BFC\u51FA\u5173\u952E\u5B57",
                maxLength: 128,
              },
              categoryId: {
                required: false,
                type: () => Number,
                description: "\u7269\u6599\u5206\u7C7B ID",
                minimum: 1,
              },
              workshopId: {
                required: false,
                type: () => Number,
                description: "\u8F66\u95F4 ID",
                minimum: 1,
              },
              trendType: {
                required: false,
                description: "\u8D8B\u52BF\u56FE\u7EDF\u8BA1\u7C7B\u578B",
                enum: t["./modules/reporting/dto/query-reporting.dto"]
                  .ReportingTrendType,
              },
              dateFrom: {
                required: false,
                type: () => String,
                description:
                  "\u5F00\u59CB\u65E5\u671F\uFF0C\u683C\u5F0F\u4E3A YYYY-MM-DD",
              },
              dateTo: {
                required: false,
                type: () => String,
                description:
                  "\u7ED3\u675F\u65E5\u671F\uFF0C\u683C\u5F0F\u4E3A YYYY-MM-DD",
              },
            },
          },
        ],
        [
          import("./modules/ai-assistant/dto/ai-chat.dto"),
          {
            AiChatDto: {
              message: { required: true, type: () => String, maxLength: 2000 },
              toolNames: {
                required: false,
                type: () => [String],
                maxLength: 64,
                maxItems: 4,
              },
            },
          },
        ],
        [
          import("./modules/auth/dto/login.dto"),
          {
            LoginDto: {
              username: {
                required: true,
                type: () => String,
                description: "\u767B\u5F55\u7528\u6237\u540D",
                minLength: 1,
                maxLength: 32,
              },
              password: {
                required: true,
                type: () => String,
                description:
                  "\u767B\u5F55\u5BC6\u7801\uFF0C\u81F3\u5C11 6 \u4F4D",
                minLength: 6,
              },
              captchaId: {
                required: true,
                type: () => String,
                description: "\u56FE\u5F62\u9A8C\u8BC1\u7801 ID",
                format: "uuid",
              },
              captchaCode: {
                required: true,
                type: () => String,
                description: "4 \u4F4D\u56FE\u5F62\u9A8C\u8BC1\u7801",
                minLength: 4,
                maxLength: 4,
              },
            },
          },
        ],
        [
          import("./modules/file-storage/dto/download-file.dto"),
          {
            DownloadFileDto: {
              path: { required: true, type: () => String, maxLength: 255 },
            },
          },
        ],
        [
          import("./modules/workflow/dto/create-audit-document.dto"),
          {
            CreateAuditDocumentDto: {
              documentFamily: { required: true, type: () => Object },
              documentType: {
                required: true,
                type: () => String,
                maxLength: 64,
              },
              documentId: { required: true, type: () => Number, minimum: 1 },
              documentNumber: {
                required: true,
                type: () => String,
                maxLength: 64,
              },
              submittedBy: {
                required: false,
                type: () => String,
                maxLength: 64,
              },
            },
          },
        ],
        [
          import("./modules/workflow/dto/query-audit-status.dto"),
          {
            QueryAuditStatusDto: {
              documentType: {
                required: true,
                type: () => String,
                maxLength: 64,
              },
              documentId: { required: true, type: () => Number, minimum: 1 },
            },
          },
        ],
        [
          import("./modules/workflow/dto/query-audits.dto"),
          {
            QueryAuditsDto: {
              documentFamily: { required: false, type: () => Object },
              auditStatus: { required: false, type: () => Object },
              limit: {
                required: false,
                type: () => Number,
                default: 50,
                minimum: 1,
              },
              offset: {
                required: false,
                type: () => Number,
                default: 0,
                minimum: 0,
              },
            },
          },
        ],
        [
          import("./modules/workflow/dto/reject-audit.dto"),
          {
            RejectAuditDto: {
              rejectReason: {
                required: false,
                type: () => String,
                maxLength: 500,
              },
            },
          },
        ],
        [
          import("./modules/inbound/dto/create-inbound-order-line.dto"),
          {
            CreateInboundOrderLineDto: {
              materialId: { required: true, type: () => Number, minimum: 1 },
              quantity: {
                required: true,
                type: () => String,
                pattern: "/^(?!0+(\\.0+)?$)\\d+(\\.\\d{1,6})?$/",
              },
              unitPrice: {
                required: false,
                type: () => String,
                pattern: "/^\\d+(\\.\\d{1,2})?$/",
              },
              remark: { required: false, type: () => String, maxLength: 500 },
            },
          },
        ],
        [
          import("./modules/inbound/dto/create-inbound-order.dto"),
          {
            CreateInboundOrderDto: {
              documentNo: { required: true, type: () => String, maxLength: 64 },
              orderType: { required: true, type: () => Object },
              bizDate: { required: true, type: () => String },
              supplierId: { required: false, type: () => Number, minimum: 1 },
              handlerPersonnelId: {
                required: false,
                type: () => Number,
                minimum: 1,
              },
              workshopId: { required: true, type: () => Number, minimum: 1 },
              remark: { required: false, type: () => String, maxLength: 500 },
              lines: {
                required: true,
                type: () => [
                  t["./modules/inbound/dto/create-inbound-order-line.dto"]
                    .CreateInboundOrderLineDto,
                ],
                minItems: 1,
              },
            },
          },
        ],
        [
          import("./modules/inbound/dto/query-inbound-order.dto"),
          {
            QueryInboundOrderDto: {
              documentNo: {
                required: false,
                type: () => String,
                description: "\u5165\u5E93\u5355\u53F7\u5173\u952E\u5B57",
                maxLength: 64,
              },
              orderType: {
                required: false,
                type: () => Object,
                description: "\u5165\u5E93\u5355\u636E\u7C7B\u578B",
              },
              bizDateFrom: {
                required: false,
                type: () => String,
                description:
                  "\u4E1A\u52A1\u65E5\u671F\u8D77\u59CB\u503C\uFF0C\u683C\u5F0F\u4E3A YYYY-MM-DD",
              },
              bizDateTo: {
                required: false,
                type: () => String,
                description:
                  "\u4E1A\u52A1\u65E5\u671F\u7ED3\u675F\u503C\uFF0C\u683C\u5F0F\u4E3A YYYY-MM-DD",
              },
              supplierId: {
                required: false,
                type: () => Number,
                description: "\u4F9B\u5E94\u5546 ID",
                minimum: 1,
              },
              workshopId: {
                required: false,
                type: () => Number,
                description: "\u8F66\u95F4 ID",
                minimum: 1,
              },
              limit: {
                required: false,
                type: () => Number,
                description:
                  "\u6BCF\u9875\u6761\u6570\uFF0C\u9ED8\u8BA4 50\uFF0C\u6700\u5927\u7531\u670D\u52A1\u7AEF\u9650\u5236",
                default: 50,
                minimum: 1,
              },
              offset: {
                required: false,
                type: () => Number,
                description:
                  "\u5206\u9875\u504F\u79FB\u91CF\uFF0C\u4ECE 0 \u5F00\u59CB",
                default: 0,
                minimum: 0,
              },
            },
          },
        ],
        [
          import("./modules/inbound/dto/update-inbound-order-line.dto"),
          {
            UpdateInboundOrderLineDto: {
              id: { required: false, type: () => Number, minimum: 1 },
              materialId: { required: true, type: () => Number, minimum: 1 },
              quantity: {
                required: true,
                type: () => String,
                pattern: "/^(?!0+(\\.0+)?$)\\d+(\\.\\d{1,6})?$/",
              },
              unitPrice: {
                required: false,
                type: () => String,
                pattern: "/^\\d+(\\.\\d{1,2})?$/",
              },
              remark: { required: false, type: () => String, maxLength: 500 },
            },
          },
        ],
        [
          import("./modules/inbound/dto/update-inbound-order.dto"),
          {
            UpdateInboundOrderDto: {
              bizDate: { required: false, type: () => String },
              supplierId: { required: false, type: () => Number, minimum: 1 },
              handlerPersonnelId: {
                required: false,
                type: () => Number,
                minimum: 1,
              },
              workshopId: { required: false, type: () => Number, minimum: 1 },
              remark: { required: false, type: () => String, maxLength: 500 },
              lines: {
                required: true,
                type: () => [
                  t["./modules/inbound/dto/update-inbound-order-line.dto"]
                    .UpdateInboundOrderLineDto,
                ],
                minItems: 1,
              },
            },
          },
        ],
        [
          import("./modules/inbound/dto/void-inbound-order.dto"),
          {
            VoidInboundOrderDto: {
              voidReason: {
                required: false,
                type: () => String,
                maxLength: 500,
              },
            },
          },
        ],
        [
          import("./modules/outbound/dto/create-outbound-order-line.dto"),
          {
            CreateOutboundOrderLineDto: {
              materialId: { required: true, type: () => Number, minimum: 1 },
              quantity: {
                required: true,
                type: () => String,
                pattern: "/^(?!0+(\\.0+)?$)\\d+(\\.\\d{1,6})?$/",
              },
              unitPrice: {
                required: false,
                type: () => String,
                pattern: "/^\\d+(\\.\\d{1,2})?$/",
              },
              startNumber: {
                required: false,
                type: () => String,
                maxLength: 64,
              },
              endNumber: { required: false, type: () => String, maxLength: 64 },
              remark: { required: false, type: () => String, maxLength: 500 },
            },
          },
        ],
        [
          import("./modules/outbound/dto/create-outbound-order.dto"),
          {
            CreateOutboundOrderDto: {
              documentNo: { required: true, type: () => String, maxLength: 64 },
              bizDate: { required: true, type: () => String },
              customerId: { required: false, type: () => Number, minimum: 1 },
              handlerPersonnelId: {
                required: false,
                type: () => Number,
                minimum: 1,
              },
              workshopId: { required: true, type: () => Number, minimum: 1 },
              remark: { required: false, type: () => String, maxLength: 500 },
              lines: {
                required: true,
                type: () => [
                  t["./modules/outbound/dto/create-outbound-order-line.dto"]
                    .CreateOutboundOrderLineDto,
                ],
                minItems: 1,
              },
            },
          },
        ],
        [
          import("./modules/outbound/dto/create-sales-return-line.dto"),
          {
            CreateSalesReturnLineDto: {
              materialId: { required: true, type: () => Number, minimum: 1 },
              quantity: {
                required: true,
                type: () => String,
                pattern: "/^(?!0+(\\.0+)?$)\\d+(\\.\\d{1,6})?$/",
              },
              sourceOutboundLineId: {
                required: true,
                type: () => Number,
                minimum: 1,
              },
              unitPrice: {
                required: false,
                type: () => String,
                pattern: "/^\\d+(\\.\\d{1,2})?$/",
              },
              remark: { required: false, type: () => String, maxLength: 500 },
            },
          },
        ],
        [
          import("./modules/outbound/dto/create-sales-return.dto"),
          {
            CreateSalesReturnDto: {
              documentNo: { required: true, type: () => String, maxLength: 64 },
              bizDate: { required: true, type: () => String },
              sourceOutboundOrderId: {
                required: true,
                type: () => Number,
                minimum: 1,
              },
              customerId: { required: false, type: () => Number, minimum: 1 },
              handlerPersonnelId: {
                required: false,
                type: () => Number,
                minimum: 1,
              },
              workshopId: { required: true, type: () => Number, minimum: 1 },
              remark: { required: false, type: () => String, maxLength: 500 },
              lines: {
                required: true,
                type: () => [
                  t["./modules/outbound/dto/create-sales-return-line.dto"]
                    .CreateSalesReturnLineDto,
                ],
                minItems: 1,
              },
            },
          },
        ],
        [
          import("./modules/outbound/dto/query-outbound-order.dto"),
          {
            QueryOutboundOrderDto: {
              documentNo: {
                required: false,
                type: () => String,
                maxLength: 64,
              },
              orderType: { required: false, type: () => Object },
              bizDateFrom: { required: false, type: () => String },
              bizDateTo: { required: false, type: () => String },
              customerId: { required: false, type: () => Number, minimum: 1 },
              workshopId: { required: false, type: () => Number, minimum: 1 },
              limit: {
                required: false,
                type: () => Number,
                default: 50,
                minimum: 1,
              },
              offset: {
                required: false,
                type: () => Number,
                default: 0,
                minimum: 0,
              },
            },
          },
        ],
        [
          import("./modules/outbound/dto/query-sales-return.dto"),
          {
            QuerySalesReturnDto: {
              documentNo: {
                required: false,
                type: () => String,
                maxLength: 64,
              },
              bizDateFrom: { required: false, type: () => String },
              bizDateTo: { required: false, type: () => String },
              customerId: { required: false, type: () => Number, minimum: 1 },
              sourceOutboundOrderId: {
                required: false,
                type: () => Number,
                minimum: 1,
              },
              workshopId: { required: false, type: () => Number, minimum: 1 },
              limit: {
                required: false,
                type: () => Number,
                default: 50,
                minimum: 1,
              },
              offset: {
                required: false,
                type: () => Number,
                default: 0,
                minimum: 0,
              },
            },
          },
        ],
        [
          import("./modules/outbound/dto/update-outbound-order-line.dto"),
          {
            UpdateOutboundOrderLineDto: {
              id: { required: false, type: () => Number, minimum: 1 },
              materialId: { required: true, type: () => Number, minimum: 1 },
              quantity: {
                required: true,
                type: () => String,
                pattern: "/^(?!0+(\\.0+)?$)\\d+(\\.\\d{1,6})?$/",
              },
              unitPrice: {
                required: false,
                type: () => String,
                pattern: "/^\\d+(\\.\\d{1,2})?$/",
              },
              startNumber: {
                required: false,
                type: () => String,
                maxLength: 64,
              },
              endNumber: { required: false, type: () => String, maxLength: 64 },
              remark: { required: false, type: () => String, maxLength: 500 },
            },
          },
        ],
        [
          import("./modules/outbound/dto/update-outbound-order.dto"),
          {
            UpdateOutboundOrderDto: {
              bizDate: { required: false, type: () => String },
              customerId: { required: false, type: () => Number, minimum: 1 },
              handlerPersonnelId: {
                required: false,
                type: () => Number,
                minimum: 1,
              },
              workshopId: { required: false, type: () => Number, minimum: 1 },
              remark: { required: false, type: () => String, maxLength: 500 },
              lines: {
                required: true,
                type: () => [
                  t["./modules/outbound/dto/update-outbound-order-line.dto"]
                    .UpdateOutboundOrderLineDto,
                ],
                minItems: 1,
              },
            },
          },
        ],
        [
          import("./modules/outbound/dto/void-outbound-order.dto"),
          {
            VoidOutboundOrderDto: {
              voidReason: {
                required: false,
                type: () => String,
                maxLength: 500,
              },
            },
          },
        ],
        [
          import("./modules/outbound/dto/void-sales-return.dto"),
          {
            VoidSalesReturnDto: {
              voidReason: {
                required: false,
                type: () => String,
                maxLength: 500,
              },
            },
          },
        ],
        [
          import("./modules/project/dto/create-project-line.dto"),
          {
            CreateProjectLineDto: {
              materialId: { required: true, type: () => Number, minimum: 1 },
              quantity: {
                required: true,
                type: () => String,
                pattern: "/^(?!0+(\\.0+)?$)\\d+(\\.\\d{1,6})?$/",
              },
              unitPrice: {
                required: false,
                type: () => String,
                pattern: "/^\\d+(\\.\\d{1,2})?$/",
              },
              remark: { required: false, type: () => String, maxLength: 500 },
            },
          },
        ],
        [
          import("./modules/project/dto/create-project.dto"),
          {
            CreateProjectDto: {
              projectCode: {
                required: true,
                type: () => String,
                maxLength: 64,
              },
              projectName: {
                required: true,
                type: () => String,
                maxLength: 128,
              },
              bizDate: { required: true, type: () => String },
              customerId: { required: false, type: () => Number, minimum: 1 },
              supplierId: { required: false, type: () => Number, minimum: 1 },
              managerPersonnelId: {
                required: false,
                type: () => Number,
                minimum: 1,
              },
              workshopId: { required: true, type: () => Number, minimum: 1 },
              remark: { required: false, type: () => String, maxLength: 500 },
              lines: {
                required: true,
                type: () => [
                  t["./modules/project/dto/create-project-line.dto"]
                    .CreateProjectLineDto,
                ],
                minItems: 1,
              },
            },
          },
        ],
        [
          import("./modules/project/dto/query-project.dto"),
          {
            QueryProjectDto: {
              projectCode: {
                required: false,
                type: () => String,
                maxLength: 64,
              },
              projectName: {
                required: false,
                type: () => String,
                maxLength: 128,
              },
              bizDateFrom: { required: false, type: () => String },
              bizDateTo: { required: false, type: () => String },
              customerId: { required: false, type: () => Number, minimum: 1 },
              supplierId: { required: false, type: () => Number, minimum: 1 },
              workshopId: { required: false, type: () => Number, minimum: 1 },
              limit: {
                required: false,
                type: () => Number,
                default: 50,
                minimum: 1,
              },
              offset: {
                required: false,
                type: () => Number,
                default: 0,
                minimum: 0,
              },
            },
          },
        ],
        [
          import("./modules/project/dto/update-project-line.dto"),
          {
            UpdateProjectLineDto: {
              id: { required: false, type: () => Number, minimum: 1 },
              materialId: { required: true, type: () => Number, minimum: 1 },
              quantity: {
                required: true,
                type: () => String,
                pattern: "/^(?!0+(\\.0+)?$)\\d+(\\.\\d{1,6})?$/",
              },
              unitPrice: {
                required: false,
                type: () => String,
                pattern: "/^\\d+(\\.\\d{1,2})?$/",
              },
              remark: { required: false, type: () => String, maxLength: 500 },
            },
          },
        ],
        [
          import("./modules/project/dto/update-project.dto"),
          {
            UpdateProjectDto: {
              bizDate: { required: false, type: () => String },
              customerId: { required: false, type: () => Number, minimum: 1 },
              supplierId: { required: false, type: () => Number, minimum: 1 },
              managerPersonnelId: {
                required: false,
                type: () => Number,
                minimum: 1,
              },
              workshopId: { required: false, type: () => Number, minimum: 1 },
              remark: { required: false, type: () => String, maxLength: 500 },
              lines: {
                required: true,
                type: () => [
                  t["./modules/project/dto/update-project-line.dto"]
                    .UpdateProjectLineDto,
                ],
                minItems: 1,
              },
            },
          },
        ],
        [
          import("./modules/project/dto/void-project.dto"),
          {
            VoidProjectDto: {
              voidReason: {
                required: false,
                type: () => String,
                maxLength: 500,
              },
            },
          },
        ],
        [
          import("./modules/scheduler/dto/create-scheduler-job.dto"),
          {
            CreateSchedulerJobDto: {
              jobName: { required: true, type: () => String, maxLength: 128 },
              invokeTarget: {
                required: true,
                type: () => String,
                maxLength: 128,
              },
              cronExpression: {
                required: true,
                type: () => String,
                maxLength: 64,
                pattern: "/^[^\\s].*[^\\s]$|^[^\\s]$/",
              },
              concurrencyPolicy: { required: false, type: () => Object },
              misfirePolicy: { required: false, type: () => Object },
              remark: { required: false, type: () => String, maxLength: 500 },
            },
          },
        ],
        [
          import("./modules/scheduler/dto/query-scheduler-job-logs.dto"),
          {
            QuerySchedulerJobLogsDto: {
              jobName: { required: false, type: () => String, maxLength: 128 },
              status: { required: false, type: () => Object },
              limit: {
                required: false,
                type: () => Number,
                default: 50,
                minimum: 1,
              },
              offset: {
                required: false,
                type: () => Number,
                default: 0,
                minimum: 0,
              },
            },
          },
        ],
        [
          import("./modules/scheduler/dto/query-scheduler-jobs.dto"),
          {
            QuerySchedulerJobsDto: {
              keyword: { required: false, type: () => String, maxLength: 128 },
              status: { required: false, type: () => Object },
              limit: {
                required: false,
                type: () => Number,
                default: 50,
                minimum: 1,
              },
              offset: {
                required: false,
                type: () => Number,
                default: 0,
                minimum: 0,
              },
            },
          },
        ],
        [
          import("./modules/scheduler/dto/update-scheduler-job.dto"),
          {
            UpdateSchedulerJobDto: {
              jobName: { required: false, type: () => String, maxLength: 128 },
              invokeTarget: {
                required: false,
                type: () => String,
                maxLength: 128,
              },
              cronExpression: {
                required: false,
                type: () => String,
                maxLength: 64,
                pattern: "/^[^\\s].*[^\\s]$|^[^\\s]$/",
              },
              concurrencyPolicy: { required: false, type: () => Object },
              misfirePolicy: { required: false, type: () => Object },
              remark: { required: false, type: () => String, maxLength: 500 },
            },
          },
        ],
        [
          import(
            "./modules/workshop-material/dto/create-workshop-material-order-line.dto"
          ),
          {
            CreateWorkshopMaterialOrderLineDto: {
              materialId: { required: true, type: () => Number, minimum: 1 },
              quantity: {
                required: true,
                type: () => String,
                pattern: "/^(?!0+(\\.0+)?$)\\d+(\\.\\d{1,6})?$/",
              },
              unitPrice: {
                required: false,
                type: () => String,
                pattern: "/^\\d+(\\.\\d{1,2})?$/",
              },
              sourceLogId: {
                required: false,
                type: () => Number,
                description:
                  "Optional source log ID for source-tracked pick consumption.",
                minimum: 1,
              },
              sourceDocumentType: {
                required: false,
                type: () => String,
                description:
                  "For return orders: upstream pick document type (e.g. WorkshopMaterialOrder).",
                maxLength: 64,
              },
              sourceDocumentId: {
                required: false,
                type: () => Number,
                description: "For return orders: upstream pick document ID.",
                minimum: 1,
              },
              sourceDocumentLineId: {
                required: false,
                type: () => Number,
                description: "For return orders: upstream pick line ID.",
                minimum: 1,
              },
              remark: { required: false, type: () => String, maxLength: 500 },
            },
          },
        ],
        [
          import(
            "./modules/workshop-material/dto/create-workshop-material-order.dto"
          ),
          {
            CreateWorkshopMaterialOrderDto: {
              documentNo: { required: true, type: () => String, maxLength: 64 },
              orderType: { required: true, type: () => Object },
              bizDate: { required: true, type: () => String },
              handlerPersonnelId: {
                required: false,
                type: () => Number,
                minimum: 1,
              },
              workshopId: { required: true, type: () => Number, minimum: 1 },
              remark: { required: false, type: () => String, maxLength: 500 },
              lines: {
                required: true,
                type: () => [
                  t[
                    "./modules/workshop-material/dto/create-workshop-material-order-line.dto"
                  ].CreateWorkshopMaterialOrderLineDto,
                ],
                minItems: 1,
              },
            },
          },
        ],
        [
          import(
            "./modules/workshop-material/dto/query-workshop-material-order.dto"
          ),
          {
            QueryWorkshopMaterialOrderDto: {
              documentNo: {
                required: false,
                type: () => String,
                maxLength: 64,
              },
              orderType: { required: false, type: () => Object },
              bizDateFrom: { required: false, type: () => String },
              bizDateTo: { required: false, type: () => String },
              workshopId: { required: false, type: () => Number, minimum: 1 },
              limit: {
                required: false,
                type: () => Number,
                default: 50,
                minimum: 1,
              },
              offset: {
                required: false,
                type: () => Number,
                default: 0,
                minimum: 0,
              },
            },
          },
        ],
        [
          import(
            "./modules/workshop-material/dto/void-workshop-material-order.dto"
          ),
          {
            VoidWorkshopMaterialOrderDto: {
              voidReason: {
                required: false,
                type: () => String,
                maxLength: 500,
              },
            },
          },
        ],
        [
          import("./modules/inventory-core/dto/decrease-stock.dto"),
          {
            DecreaseStockDto: {
              materialId: { required: true, type: () => Number, minimum: 1 },
              workshopId: { required: true, type: () => Number, minimum: 1 },
              quantity: {
                required: true,
                type: () => String,
                pattern: "/^(?!0+(\\.0+)?$)\\d+(\\.\\d{1,6})?$/",
              },
              operationType: {
                required: true,
                type: () => String,
                maxLength: 64,
              },
              businessModule: {
                required: true,
                type: () => String,
                maxLength: 64,
              },
              businessDocumentType: {
                required: true,
                type: () => String,
                maxLength: 64,
              },
              businessDocumentId: {
                required: true,
                type: () => Number,
                minimum: 1,
              },
              businessDocumentNumber: {
                required: true,
                type: () => String,
                maxLength: 64,
              },
              businessDocumentLineId: {
                required: false,
                type: () => Number,
                minimum: 1,
              },
              idempotencyKey: {
                required: true,
                type: () => String,
                maxLength: 128,
              },
              note: { required: false, type: () => String, maxLength: 500 },
            },
          },
        ],
        [
          import("./modules/inventory-core/dto/increase-stock.dto"),
          {
            IncreaseStockDto: {
              materialId: { required: true, type: () => Number, minimum: 1 },
              workshopId: { required: true, type: () => Number, minimum: 1 },
              quantity: {
                required: true,
                type: () => String,
                pattern: "/^(?!0+(\\.0+)?$)\\d+(\\.\\d{1,6})?$/",
              },
              operationType: {
                required: true,
                type: () => String,
                maxLength: 64,
              },
              businessModule: {
                required: true,
                type: () => String,
                maxLength: 64,
              },
              businessDocumentType: {
                required: true,
                type: () => String,
                maxLength: 64,
              },
              businessDocumentId: {
                required: true,
                type: () => Number,
                minimum: 1,
              },
              businessDocumentNumber: {
                required: true,
                type: () => String,
                maxLength: 64,
              },
              businessDocumentLineId: {
                required: false,
                type: () => Number,
                minimum: 1,
              },
              idempotencyKey: {
                required: true,
                type: () => String,
                maxLength: 128,
              },
              note: { required: false, type: () => String, maxLength: 500 },
            },
          },
        ],
        [
          import("./modules/inventory-core/dto/reverse-stock.dto"),
          {
            ReverseStockDto: {
              logIdToReverse: {
                required: true,
                type: () => Number,
                minimum: 1,
              },
              idempotencyKey: {
                required: true,
                type: () => String,
                maxLength: 128,
              },
              note: { required: false, type: () => String, maxLength: 500 },
            },
          },
        ],
      ],
      controllers: [
        [import("./app.controller"), { AppController: { getHealth: {} } }],
        [
          import("./modules/audit-log/controllers/audit-log.controller"),
          {
            AuditLogController: {
              listLoginLogs: {},
              deleteLoginLog: {},
              clearLoginLogs: {},
              listOperLogs: {},
              deleteOperLog: {},
              clearOperLogs: {},
            },
          },
        ],
        [
          import("./modules/master-data/controllers/master-data.controller"),
          {
            MasterDataController: {
              listMaterials: {},
              getMaterial: { type: Object },
              createMaterial: {},
              updateMaterial: {},
              listCustomers: {},
              listSuppliers: {},
              listPersonnel: {},
              listWorkshops: {},
            },
          },
        ],
        [
          import("./modules/inventory-core/controllers/inventory.controller"),
          {
            InventoryController: {
              listBalances: {},
              listLogs: {},
              listSourceUsages: {},
            },
          },
        ],
        [
          import("./modules/reporting/controllers/reporting.controller"),
          {
            ReportingController: {
              getHomeDashboard: {},
              getInventorySummary: {},
              getMaterialCategorySummary: {},
              getTrendSeries: {},
              exportReport: {},
            },
          },
        ],
        [
          import("./modules/ai-assistant/controllers/ai-assistant.controller"),
          { AiAssistantController: { listTools: {}, chat: {} } },
        ],
        [
          import("./modules/rbac/controllers/rbac.controller"),
          { RbacController: { getCurrentRoutes: { type: [Object] } } },
        ],
        [
          import("./modules/session/controllers/sessions.controller"),
          { SessionsController: { listOnlineSessions: {}, forceLogout: {} } },
        ],
        [
          import("./modules/auth/controllers/auth.controller"),
          {
            AuthController: {
              generateCaptcha: {},
              login: {},
              logout: {},
              getCurrentUser: { type: Object },
              getRoutes: { type: [Object] },
            },
          },
        ],
        [
          import("./modules/file-storage/controllers/file-storage.controller"),
          {
            FileStorageController: {
              uploadFile: { type: Object },
              uploadAvatar: { type: Object },
              downloadFile: {},
            },
          },
        ],
        [
          import("./modules/workflow/controllers/workflow.controller"),
          {
            WorkflowController: {
              getAuditStatus: { type: Object },
              listAudits: {},
              createAuditDocument: {},
              approve: {},
              reject: {},
              reset: {},
            },
          },
        ],
        [
          import("./modules/inbound/controllers/inbound.controller"),
          {
            InboundController: {
              listOrders: {},
              getOrder: { type: Object },
              createOrder: { type: Object },
              updateOrder: { type: Object },
              voidOrder: { type: Object },
              listIntoOrders: {},
              createIntoOrder: { type: Object },
            },
          },
        ],
        [
          import("./modules/outbound/controllers/outbound.controller"),
          {
            OutboundController: {
              listOrders: {},
              getOrder: { type: Object },
              createOrder: { type: Object },
              updateOrder: { type: Object },
              voidOrder: { type: Object },
              listSalesReturns: {},
              getSalesReturn: { type: Object },
              createSalesReturn: { type: Object },
              voidSalesReturn: { type: Object },
            },
          },
        ],
        [
          import("./modules/project/controllers/project.controller"),
          {
            ProjectController: {
              listProjects: {},
              getProject: { type: Object },
              createProject: { type: Object },
              updateProject: { type: Object },
              voidProject: { type: Object },
              listMaterials: {},
            },
          },
        ],
        [
          import("./modules/scheduler/controllers/scheduler.controller"),
          {
            SchedulerController: {
              listJobs: {},
              createJob: {},
              updateJob: {},
              runJob: {},
              pauseJob: {},
              resumeJob: {},
              listJobLogs: {},
            },
          },
        ],
        [
          import(
            "./modules/workshop-material/controllers/workshop-material.controller"
          ),
          {
            WorkshopMaterialController: {
              listPickOrders: {},
              getPickOrder: { type: Object },
              createPickOrder: { type: Object },
              voidPickOrder: { type: Object },
              listReturnOrders: {},
              getReturnOrder: { type: Object },
              createReturnOrder: { type: Object },
              voidReturnOrder: { type: Object },
              listScrapOrders: {},
              getScrapOrder: { type: Object },
              createScrapOrder: { type: Object },
              voidScrapOrder: { type: Object },
            },
          },
        ],
      ],
    },
  };
};
