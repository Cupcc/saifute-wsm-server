# 代码质量治理基线

## 1. 文档目标与适用范围

本文档定义 Saifute WMS NestJS 仓库的代码质量治理规则。所有 agent 会话、子代理执行和人工 code review 均以此为判定基准。

适用范围：`src/modules/**`、`src/shared/**` 下所有 TypeScript 生产代码和测试代码（`src/generated/` 除外）。

与其他文档的关系：

- `00-architecture-overview.md` 定义模块清单、技术栈和依赖总图——是"系统长什么样"
- 本文档定义"代码必须怎么写"——是质量执行标准
- `docs/playbooks/domain-refactor/playbook.md` 记录具体重构经验——是"怎么改已有问题"

优先级：若本文档与模块文档（`modules/*.md`）有冲突，以本文档为准；若与 `00-architecture-overview.md` 有冲突，需人工仲裁并更新两侧。

---

## 2. 分层纪律（Layer Discipline）

### 2.1 层间依赖方向

```text
controllers/  →  application/  →  infrastructure/
     ↓               ↓                  ↓
    dto/            domain/          Prisma / Redis / 外部 API
```

**严格规则**：依赖方向只能向右和向下，不允许反向。

### 2.2 各层允许的 import 范围


| 层                 | 允许 import                                                                | 禁止 import                                           |
| ----------------- | ------------------------------------------------------------------------ | --------------------------------------------------- |
| `controllers/`    | dto/, application/ service, shared/decorators, shared/guards             | infrastructure/, Prisma, 其他模块内部                     |
| `application/`    | domain/, dto/(仅类型), 本模块 repository interface, 其他模块的 **exported service** | `@prisma/client`, `PrismaService`, 其他模块的 repository |
| `domain/`         | 仅标准库和本模块 domain/ 内类型                                                     | 任何外部框架（NestJS, Prisma, Express）                     |
| `infrastructure/` | Prisma, Redis, 外部 SDK, domain/                                           | controllers/, 其他模块 infrastructure                   |
| `dto/`            | class-validator, class-transformer, shared/domain/                       | application/, infrastructure/                       |


### 2.3 关键禁令

1. **application 层禁止 Prisma** — 不允许 import `Prisma`, `PrismaService`, 或 `@prisma/client` 中的任何类型。需要使用 `Decimal` 时，使用 `shared/common` 或 domain 层的 value object 替代。
2. **application 层禁止直接执行事务** — 事务边界由 repository 或 Unit of Work 模式封装，service 只调用 repository 方法。
3. **controllers 禁止业务逻辑** — 不允许 if/else 业务分支、循环计算、数据聚合。只做：解析请求 → 调用 service → 返回响应。

### 2.4 过渡期处理

当前 25 个 service 文件存在 Prisma import 和直接事务执行。这些属于历史存量，在重构前允许存在，但：

- **新增代码不得引入新的分层违规**
- 修改现有文件时，如果改动涉及 Prisma 调用，应在同一 PR 中将该调用下沉到 repository

---

## 3. 模块边界（Module Boundaries）

### 3.1 跨模块通信规则


| 允许                          | 禁止                               |
| --------------------------- | -------------------------------- |
| 注入其他模块 **exported service** | 注入其他模块 repository                |
| 使用 shared/ 下的公共类型           | import 其他模块 infrastructure/ 下的文件 |
| 通过 EventEmitter 发事件         | 直接调用其他模块的 private 方法             |


### 3.2 模块依赖方向

```text
                ┌──────────┐
                │  shared/ │
                └─────┬────┘
                      │ (所有模块可依赖)
       ┌──────────────┼──────────────┐
       ▼              ▼              ▼
┌────────────┐ ┌───────────┐ ┌─────────────┐
│ master-data│ │ approval  │ │ auth/rbac/  │
│            │ │           │ │ session     │
└─────┬──────┘ └─────┬─────┘ └─────────────┘
      │               │
      ▼               ▼
┌─────────────────────────────┐
│       inventory-core        │  (唯一库存写入口)
└──────────────┬──────────────┘
               │
    ┌──────────┼──────────┬────────────┐
    ▼          ▼          ▼            ▼
┌───────┐ ┌───────┐ ┌──────────┐ ┌──────────┐
│inbound│ │ sales │ │workshop- │ │rd-project│
│       │ │       │ │material  │ │          │
└───────┘ └───────┘ └──────────┘ └────┬─────┘
                                      │ (仅通过 service)
                                      ▼
                                ┌──────────────┐
                                │rd-subwarehouse│
                                └──────────────┘

┌───────────┐
│ reporting │ ──→ inventory-core (只读), master-data (只读)
└───────────┘

┌──────────────┐
│ ai-assistant │ ──→ reporting, master-data, inventory-core (只读)
└──────────────┘
```

**核心原则**：

- 箭头只能向下或同层，不能向上
- 上层模块只通过 service 接口访问下层
- `inventory-core` 是唯一库存写入口，任何模块不得绕过它直接写库存表
- `reporting` 和 `ai-assistant` 是只读消费者，不得触发写操作

### 3.3 Module 导出规则

- `*.module.ts` 的 `exports` 只允许 service，**不允许导出 repository**
- 如果其他模块需要某个查询能力，应在 service 上暴露查询方法

### 3.4 已知违规（审计基线）

- `rd-subwarehouse` 直接注入 `RdProjectRepository`（应改为通过 `RdProjectService`）
- `approval.module.ts` 导出 `ApprovalRepository`（应只导出 `ApprovalService`）

---

## 4. 单一职责与文件治理（Single Responsibility）

### 4.1 量化阈值


| 指标            | 阈值        | 处置                          |
| ------------- | --------- | --------------------------- |
| 文件行数          | **500 行** | 超过即为违规，必须拆分                 |
| 单个方法/函数       | **80 行**  | 超过应提取为独立方法或协作者              |
| 构造函数依赖注入数     | **5 个**   | 超过表明职责过多，应拆分 service        |
| 类的 public 方法数 | **15 个**  | 超过应按职责域拆分为多个 service        |
| 方法参数数         | **5 个**   | 超过应封装为 command/query object |


### 4.2 God Object 识别标准

满足以下**任一**条件即判定为 God Object：

1. 构造函数注入 ≥ 5 个依赖
2. 文件超过 800 行
3. 同一个 class 处理 3 个以上互不相关的业务职责域

### 4.3 拆分原则

- **application 层**：按 use case（用例）拆分。一个 service 文件承担一个业务用例族。
  - 示例：`SalesService` → `SalesOutboundService` + `SalesReturnService`
- **infrastructure 层**：按聚合根或读模型来源拆分。
  - 示例：`ReportingRepository` → `MonthlyReportRepository` + `HomeMetricsRepository`
- **spec 文件**：跟随生产代码拆分。当 service 被拆为多个文件时，spec 也应对应拆分。

### 4.4 Facade 模式

拆分后，可保留原 service 文件作为 facade（薄代理），只负责委托调用，不含业务逻辑。这样可以保持 controller 和 module 注册稳定。Facade 文件通常 < 100 行。

### 4.5 新增代码的默认行为

- 新增功能不得追加到已超过 400 行的文件
- 新增 use case 应创建独立 service 文件
- 如果一个 PR 会让某文件超过 500 行，该 PR 必须同时包含拆分
- **禁止创建无语义命名的"万能抽屉"文件**：`utils.ts` / `helpers.ts` / `common.ts` / `misc.ts` 等一律不予通过。工具函数必须归属到明确的领域子目录（如 `<module>/domain/`、`shared/domain/`、`shared/infrastructure/`），并以职责命名（例：`decimal-precision.util.ts`、`business-document-ref.factory.ts`）。
- **Rule of Three（抽取阈值）**：同一段逻辑出现 **< 3 次** 时保持内联重复，不预先抽取。仅当出现 ≥ 3 次且语义一致、变更节奏同步时，才抽取为共享函数/VO。依据：Martin Fowler《Refactoring》——过早抽象的成本（错误的接口、虚假的耦合）高于重复的成本。

---

## 5. 领域建模（Domain Modeling）

### 5.1 数据团簇（Data Clump）识别与封装

当 3 个以上字段总是一起出现在多个方法签名或接口定义中时，应提取为 Value Object。

**已识别的数据团簇**：


| 团簇                                          | 出现频次 | 建议封装                       |
| ------------------------------------------- | ---- | -------------------------- |
| businessDocumentType + Id + Number + LineId | 20+  | `BusinessDocumentRef`      |
| materialCategoryId/Code/Name/PathSnapshot   | 10+  | `MaterialCategorySnapshot` |
| stockScope + workshopId + stockScopeId      | 15+  | `StockScopeContext`        |


**封装位置**：`src/shared/domain/` 或所属模块的 `domain/` 目录。

### 5.2 Value Object 引入时机

- 同一组字段在 **3 个以上方法** 间传递时
- 同一组字段需要 **校验逻辑**（如 Decimal 精度、非空约束）时
- 同一组字段在 **跨模块** 传递时（应放入 shared/domain/）

### 5.3 贫血模型改善方向

当前所有业务模块使用贫血模型（service 持有全部逻辑，entity 只是数据容器）。改善方向：

1. **短期**：通过 Value Object 封装数据团簇，减少参数传递
2. **中期**：对核心聚合（如 InventoryBalance、StockInOrder）引入 domain entity，将不变量校验移入 entity
3. **长期**：将复杂状态机（如 RdMaterialStatus）封装为 domain service + entity 协作

改善应渐进式，不做一次性大重写。每次触及相关代码时小步改进。

---

## 6. 复杂度控制（Complexity Control）

### 6.1 嵌套深度

- 条件/循环嵌套不超过 **3 层**
- 超过 3 层时必须提取为独立方法、使用 guard clause（early return）或管道化处理

### 6.2 Guard Clause 优先

```typescript
// 禁止
async createOrder(dto: CreateOrderDto) {
  if (dto.lines.length > 0) {
    if (dto.lines.every(l => l.quantity > 0)) {
      // ...200 行业务逻辑
    } else {
      throw new BadRequestException("...");
    }
  } else {
    throw new BadRequestException("...");
  }
}

// 推荐
async createOrder(dto: CreateOrderDto) {
  if (dto.lines.length === 0) throw new BadRequestException("...");
  if (!dto.lines.every(l => l.quantity > 0)) throw new BadRequestException("...");
  // ...业务逻辑（无额外嵌套）
}
```

### 6.3 Switch/Map 替代长 if-else 链

当条件分支超过 3 个时，应使用 Map/Record 查表或策略模式替代。

### 6.4 Prisma 查询复杂度

- 嵌套 `include/select` 不超过 **3 层**
- 超过时应拆分为多次查询或使用 raw SQL
- `Promise.all` 并行查询不超过 **5 个**，超过时应评估是否存在 N+1 或数据模型问题

### 6.5 异常处理边界

**禁止"以防万一"的 try-catch**。`catch` 块只有在满足以下至少一个目的时才允许存在：

1. **语义转换**：将底层异常转为领域异常（如 `PrismaClientKnownRequestError` → `BusinessConflictException`）
2. **有意义的降级**：catch 后返回可接受的 fallback 值，并记录 warn 级日志
3. **资源清理**：配合 `finally` 释放连接、文件句柄等
4. **边界捕获**：在消息消费者、定时任务入口等"顶层"防止进程崩溃，必须记录 error 级日志

**明确禁止的反模式**：

```typescript
// 禁止：吞掉异常
try { await doSomething(); } catch (e) { /* ignore */ }

// 禁止：log + rethrow（NestJS 全局过滤器已统一处理）
try { await doSomething(); } catch (e) { this.logger.error(e); throw e; }

// 禁止：catch 后抛出相同异常（等同于没写）
try { await doSomething(); } catch (e) { throw e; }
```

**默认行为**：让异常冒泡到 NestJS 全局 `ExceptionFilter`，由框架统一转换为 HTTP 响应。Controller / Service 默认不写 try-catch。

---

## 7. 质量门禁（Quality Gates）

### 7.1 当前门禁链

```text
pre-commit (lint-staged)
  └── biome check --write（仅暂存文件，格式 + lint）

commit-msg
  └── commitlint（提交信息格式）

pre-push (verify)
  └── prisma generate → typecheck → test
```

### 7.2 门禁应覆盖的检查项


| 检查项                            | 当前状态               | 目标状态                    |
| ------------------------------ | ------------------ | ----------------------- |
| 代码格式 (biome format)            | pre-commit ✓       | 不变                      |
| Lint 规则 (biome lint)           | pre-commit ✓       | 不变                      |
| 文件行数 (noExcessiveLinesPerFile) | **warn 级别，不阻断**    | error 级别，阻断             |
| TypeScript 类型检查                | pre-push ✓         | 不变                      |
| 单元测试                           | pre-push ✓         | 不变                      |
| 文件行数扫描 (lint:src-lines)        | **--no-error，不阻断** | 纳入 verify，移除 --no-error |
| 跨模块 import 检查                  | **不存在**            | 待建设                     |
| 构造函数依赖数检查                      | **不存在**            | 待建设                     |


### 7.3 Agent 执行前自检清单

Agent 在提交代码前必须通过以下检查：

```bash
bun run lint          # zero errors
bun run typecheck     # zero errors
bun run test          # all pass
bun run lint:src-lines  # zero violations (500 line threshold)
```

### 7.4 Code Review 检查维度

无论人工还是 agent review，必须覆盖：

1. **分层合规** — 是否有新的 Prisma import 进入 application 层？
2. **边界合规** — 是否有跨模块 repository 注入？
3. **体积合规** — 文件是否超 500 行？方法是否超 80 行？
4. **复杂度合规** — 是否存在 4 层以上嵌套？
5. **测试覆盖** — 新增用例是否有对应测试？
6. **命名一致性** — 是否符合模块命名约定？

---

## 8. 审计基线（2026-04-21 快照）

记录当前已知违规的量化数据，用于跟踪改善趋势。

### 8.1 文件行数违规（> 500 行）

- **违规文件数**：23 / 273（8.4%）
- **Top 5**：
  - `rbac/infrastructure/in-memory-rbac.repository.ts` — 2391 行
  - `reporting/infrastructure/reporting.repository.ts` — 2165 行
  - `reporting/application/monthly-reporting.service.ts` — 2106 行
  - `sales/application/sales.service.ts` — 1738 行
  - `inventory-core/application/inventory.service.spec.ts` — 1647 行

### 8.2 分层违规（application 层 Prisma 依赖）

- **违规文件数**：25 / 273
- **主要模式**：`import { Prisma } from ...`、注入 `PrismaService`

### 8.3 模块边界违规

- **跨模块 Repository 注入**：2 处（rd-subwarehouse → RdProjectRepository）
- **Repository 导出**：2 处（approval, rd-subwarehouse）

### 8.4 God Object


| Service                 | 行数   | 构造函数依赖 | 判定       |
| ----------------------- | ---- | ------ | -------- |
| InventoryService        | 1633 | 4      | 行数超标     |
| SalesService            | 1738 | 6      | 行数+依赖双超标 |
| WorkshopMaterialService | 1495 | 5      | 行数+依赖双超标 |
| RdProjectService        | 1502 | 4      | 行数超标     |
| MonthlyReportingService | 2106 | 2      | 行数超标     |


### 8.5 趋势跟踪

每次执行 `bun run lint:src-lines --json` 可获取最新数据。建议每月或每个大版本后更新本节基线数字。

---

## 附录 A：正面案例

### master-data 模块拆分

`master-data` 模块已完成 service 拆分，是当前仓库的最佳实践参考：

```text
master-data/application/
├── master-data.service.ts        (facade, 269 行, 注入 8 个子 service)
├── customer.service.ts           (167 行, 注入 1 个 repository)
├── material.service.ts           (170 行, 注入 1 个 repository)
├── material-category.service.ts  (< 200 行)
├── supplier.service.ts           (168 行)
├── personnel.service.ts          (< 100 行)
├── workshop.service.ts           (< 100 行)
├── stock-scope.service.ts        (< 100 行)
└── field-suggestions.service.ts  (< 100 行)
```

**关键模式**：

- 原 MasterDataService 保留为 facade，只做委托
- 每个子 service 只注入 1 个 repository，职责单一
- Controller 和 DTO 保持不变，模块对外接口稳定
- Spec 文件对应拆分为 `customer.service.spec.ts` 等

---

## 附录 B：判定速查表


| 问题                                     | 判定标准                                             | 行动                        |
| -------------------------------------- | ------------------------------------------------ | ------------------------- |
| 新文件该放 application/ 还是 infrastructure/? | 是否 import Prisma/Redis/外部 SDK？是 → infrastructure | 按层归类                      |
| 是否需要新建 service？                        | 现有 service 已有 5+ 依赖或 400+ 行？是 → 新建               | 按 use case 拆分             |
| 跨模块需要数据怎么办？                            | 对方 module exports 里有合适的 service 方法吗？             | 有 → 注入 service；无 → 请求对方新增 |
| 一组字段总是一起出现？                            | 出现 3+ 次？                                         | 封装为 Value Object          |
| 方法太长？                                  | > 80 行                                           | 提取子方法或创建 helper           |


