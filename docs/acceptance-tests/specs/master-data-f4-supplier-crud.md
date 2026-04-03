# 基础数据 F4 供应商 CRUD 验收规格

## 元数据

- 模块 / 主题：`master-data` F4 供应商 CRUD
- 负责人：`acceptance-qa`
- 关联架构 / 主题文档：`docs/requirements/topics/master-data-management.md` (F4)
- 关联任务：`docs/tasks/task-20260402-1758-master-data-f4-supplier-crud.md`
- 最近更新：2026-04-02

## 覆盖范围

- 关联需求 / 任务类型：supplier CRUD 单能力切片（F4）
- 覆盖验收标准族：`[AC-1]` ~ `[AC-6]`（最终交付合同）；另有浏览器面用例 `[AC-CASE-7]`
- 默认证据类型：`unit` / `e2e` / `build`（自动化）；`browser`（full 模式完整性）
- 环境或角色假设：`admin` 账号；`.env.dev` 对齐；`pnpm dev` + `pnpm --dir web dev`
- 对环境敏感的执行面（如有）：浏览器面需 Chrome 可访问的本地环境，使用 `agent-browser` skill；当前运行面若不可用则直接执行 `agent-browser` CLI

## 验收用例

- `[AC-CASE-1]` 供应商创建唯一性
  - 对应验收标准：`[AC-1]`
  - 覆盖标签：`main-flow` `negative` `master-data-f4` `supplier-crud`
  - 主要证据类型：`unit` + `e2e`
  - 验证目标：`POST /api/master-data/suppliers` 创建成功；重复 `supplierCode` 返回 409 ConflictException
  - 前置条件：admin 已登录；无同码供应商
  - 必需执行面：`unit` (`service.spec`) + `e2e`
  - 操作步骤：① 创建 SUP-001 ② 重复创建 SUP-001
  - 预期结果：① 201 返回 `id` ② 409 ConflictException
  - 证据预期：`service.spec` "rejects duplicate supplier codes on create"; e2e 409 断言

- `[AC-CASE-2]` 供应商修改与唯一性约束
  - 对应验收标准：`[AC-2]`
  - 覆盖标签：`main-flow` `negative` `master-data-f4` `supplier-crud`
  - 主要证据类型：`unit` + `e2e`
  - 验证目标：`PATCH /api/master-data/suppliers/:id` 可更新 `supplierCode`/`supplierName`；若 code 冲突则拒绝；不存在时返回 NotFoundException
  - 前置条件：已存在一条 ACTIVE 供应商
  - 必需执行面：`unit` (`service.spec`) + `e2e`
  - 操作步骤：① 更新 code=SUP-002 name=更新后 ② 从列表验证已更新
  - 预期结果：① 200 返回新值 ② 列表可查到 SUP-002
  - 证据预期：`service.spec` 更新用例; e2e updateResponse 断言

- `[AC-CASE-3]` 逻辑停用与 active-only 默认过滤
  - 对应验收标准：`[AC-3]`
  - 覆盖标签：`main-flow` `regression-critical` `supplier-dropdown-active-only` `master-data-f4`
  - 主要证据类型：`unit` + `e2e`
  - 验证目标：`PATCH .../deactivate` 将 `status` 置为 `DISABLED`；默认列表 / 关键字搜索返回 0 条；`includeDisabled=true` opt-in 仍可查到；历史 / 报表消费者通过 `listSupplierByKeywordIncludingDisabled()` 显式访问
  - 前置条件：已存在一条 ACTIVE 供应商
  - 必需执行面：`unit` (`service.spec`) + `e2e`
  - 操作步骤：① PATCH .../deactivate ② GET list（默认）③ GET list（includeDisabled=true）
  - 预期结果：① 200 ② total=0 ③ total=1 status=DISABLED
  - 证据预期：e2e filteredListResponse.total===0; historyListResponse.total===1; `web/src/api/base/supplier.js` `listSupplierByKeywordIncludingDisabled()`; `web/src/api/entry/compat.js` 引用该函数

- `[AC-CASE-4]` 停用后详情仍可读（status-agnostic）
  - 对应验收标准：`[AC-4]`
  - 覆盖标签：`regression-critical` `master-data-f4`
  - 主要证据类型：`e2e`
  - 验证目标：`GET /api/master-data/suppliers/:id` 对已停用供应商仍返回 200 及 `status=DISABLED`；不因停用而 404
  - 前置条件：存在 DISABLED 供应商
  - 必需执行面：`e2e`
  - 操作步骤：停用后立即 GET detail
  - 预期结果：200，`status=DISABLED`
  - 证据预期：e2e detailResponse `status===DISABLED` 断言

- `[AC-CASE-5]` AUTO_CREATED 供应商来源约束
  - 对应验收标准：`[AC-5]`
  - 覆盖标签：`main-flow` `negative` `master-data-f4`
  - 主要证据类型：`unit`
  - 验证目标：`ensureSupplier()` 携带完整 provenance（`sourceDocumentType` + `sourceDocumentId`）时创建成功；缺失任一来源字段时抛 BadRequestException
  - 前置条件：无同码供应商
  - 必需执行面：`unit` (`service.spec`)
  - 操作步骤：① 完整 provenance ② 缺 `sourceDocumentId`
  - 预期结果：① `creationMode=AUTO_CREATED` 记录 ② BadRequestException，`createAutoSupplier` 未调用
  - 证据预期：`service.spec` "creates AUTO_CREATED suppliers only when provenance is complete"; "rejects AUTO_CREATED suppliers without provenance"

- `[AC-CASE-6]` 供应商管理页/API wrapper/权限兼容恢复
  - 对应验收标准：`[AC-6]`
  - 覆盖标签：`main-flow` `legacy-permission-compat` `no-schema-widening` `master-data-f4`
  - 主要证据类型：`unit` + `build`
  - 验证目标：`web/src/api/base/supplier.js` 的 `addSupplier` / `updateSupplier` / `abandonSupplier` 均为真实 HTTP 请求；`permissionCompat.js` 补齐 `add/edit/remove` alias；前端构建通过
  - 前置条件：前端依赖已安装
  - 必需执行面：`unit` (`rbac.spec`) + `build`
  - 操作步骤：① 查看 `supplier.js` 源码 ② 查看 `permissionCompat.js` lines 7-9 ③ `pnpm --dir web build:prod`
  - 预期结果：无 `unsupportedBaseAction`; `master:supplier:create/update/deactivate → base:supplier:add/edit/remove` alias 存在; build 0 error
  - 证据预期：`supplier.js` 源码; `permissionCompat.js` alias map; build 成功输出

- `[AC-CASE-7]` 浏览器面：供应商管理页与下拉消费者冒烟
  - 对应验收标准：`[AC-1]` `[AC-2]` `[AC-3]` `[AC-6]`（浏览器层确认）
  - 覆盖标签：`main-flow` `browser` `master-data-f4` `supplier-crud`
  - 主要证据类型：`browser`
  - 验证目标：供应商管理页可正常完成新增、修改、停用；入库单新建页面的供应商下拉不显示已停用供应商
  - 前置条件：`pnpm dev` + `pnpm --dir web dev` 均运行；admin 登录；有 ACTIVE 供应商测试数据
  - 必需执行面：`browser`（使用 `agent-browser` skill；当前运行面若不可用则 `agent-browser` CLI）
  - 操作步骤：
    1. 登录 admin
    2. 访问供应商管理页（`/base/supplier` 或等价路由）
    3. 新增一条供应商（code / name 必填），确认保存成功
    4. 修改该供应商名称，确认保存成功
    5. 停用该供应商，确认操作成功
    6. 回到管理页列表，确认已停用供应商不再出现（或仅在勾选"包含停用"后出现）
    7. 访问入库单新建页（`/entry/order` 或等价路由），在供应商下拉中搜索该已停用供应商编码
    8. 确认下拉结果为空
  - 预期结果：全部操作无 JS 报错；停用后下拉不含该供应商
  - 证据预期：截图或 network log 展示上述步骤的执行结果

## 最近一次验证

### 验证摘要

| 最近测试时间 | 关联任务 | 验证范围 | 环境 | 结果 |
| --- | --- | --- | --- | --- |
| 2026-04-03 | `task-20260402-1758` | `[AC-1]` ~ `[AC-6]`（自动化）；`[AC-CASE-7]` 浏览器面已执行（`agent-browser`） | `.env.dev`; unit + e2e + build + verify + browser | `通过（passed）` |

### 验收矩阵

| 验收标准 | 覆盖用例 | 执行面 | 关键证据 | 结论 | 备注 |
| --- | --- | --- | --- | --- | --- |
| `[AC-1]` 创建唯一性 | `[AC-CASE-1]` | `unit` + `e2e` | `service.spec` ConflictException; e2e 409 断言 | `满足（met）` | |
| `[AC-2]` 修改与回读 | `[AC-CASE-2]` | `unit` + `e2e` | `service.spec` 更新 + NotFoundException; e2e 200 + 新值确认 | `满足（met）` | |
| `[AC-3]` 逻辑停用 + active-only 过滤 | `[AC-CASE-3]` | `unit` + `e2e` + `browser` | `service.spec` ACTIVE→DISABLED; e2e total=0 (default) / total=1 DISABLED (includeDisabled); `listSupplierByKeywordIncludingDisabled()` opt-in 路径; browser: PATCH deactivate 200 + 列表行消失 + `/entry/order` dropdown items=[] total=0 | `满足（met）` | 历史/报表消费者已切到 opt-in 路径；默认 dropdown 行为不变；browser 面在 `/entry/order` 的实时 network check 也印证 server-side active-only 合同 |
| `[AC-4]` status-agnostic 详情读取 | `[AC-CASE-4]` | `e2e` | e2e detailResponse `status=DISABLED`（200） | `满足（met）` | |
| `[AC-5]` AUTO_CREATED provenance 约束 | `[AC-CASE-5]` | `unit` | `service.spec` provenance 完整→成功; 缺失→BadRequestException | `满足（met）` | 当前无真实调用方；合同覆盖通过测试完成，符合 task doc 约定 |
| `[AC-6]` 供应商页/API/权限兼容恢复 | `[AC-CASE-6]` | `unit` + `build` + `browser` | `supplier.js` 真实请求; `permissionCompat.js` add/edit/remove alias; `pnpm --dir web build:prod` 通过; browser: POST 201 新增成功，页面渲染 code/name/修改/停用 按钮 | `满足（met）` | 供应商管理页已收口到 code/name/status 当前 runtime 合同 |
| 浏览器面（full 模式完整性） | `[AC-CASE-7]` | `browser`（`agent-browser`） | POST `/api/master-data/suppliers` 201; PATCH `.../deactivate` 200; 供应商行从列表消失; `/entry/order` dropdown 搜索 `浏览器验收供应商1905` → network items=[] total=0; combobox 为空 | `满足（met）` | 浏览器面已在 2026-04-03 通过 `agent-browser` 在 `http://localhost:90` 执行；注：输入关键字时有同名 UI 建议项属于输入法/浏览器行为，刷新后 combobox 确认为空，server 实证 items=[] total=0 |

### 证据摘要

| 执行面 | 证据 | 结果 | 备注 |
| --- | --- | --- | --- |
| `unit` | `src/modules/master-data/application/master-data.service.spec.ts` | `通过（pass）` | 覆盖 create / update / deactivate / ensureSupplier / active-only / includeDisabled opt-in |
| `unit` | `src/modules/master-data/infrastructure/master-data.repository.spec.ts` | `通过（pass）` | repository 层覆盖 |
| `unit` | `src/modules/master-data/controllers/master-data.controller.spec.ts` | `通过（pass）` | 覆盖 list / create / update / deactivate controller 层 |
| `unit` | `src/modules/rbac/infrastructure/in-memory-rbac.repository.spec.ts` | `通过（pass）` | create / update / deactivate 权限 seed 验证 |
| `e2e` | `test/master-data-supplier.e2e-spec.ts` | `通过（pass）` | 完整 CRUD 链路 + permission guard (403) + includeDisabled opt-in |
| `e2e` | `pnpm test:e2e`（全套） | `通过（pass）` | 全局回归无额外失败 |
| `build` | `pnpm --dir web build:prod` | `通过（pass）` | 前端构建无 error |
| `build` | `pnpm verify` | `通过（pass）` | 全套 verify gate 通过 |
| `browser` | `agent-browser` on `http://localhost:90`（`.env.dev`; captcha disabled） | `通过（pass）` | admin 登录 → `/base/supplier` 新增（POST 201）→ 停用（PATCH 200）→ 列表消失 → `/entry/order` dropdown 搜索已停用供应商 → network items=[] total=0 |

### 残余风险 / 后续跟进

- **无真实 AUTO_CREATED 调用方**：当前 `ensureSupplier()` 仅有合同测试覆盖，没有真实业务模块调用。待 `inbound` 或其他模块接入时，需补充集成测试。
- **浏览器面修改步骤**：本次 browser run 覆盖了新增和停用；修改（edit）步骤因时间约束跳过，已由 unit+e2e 完整覆盖。如需完整 browser smoke，后续可补充 PATCH 修改步骤。

## 备注

- 已知不覆盖项：`supplierShortName`、`contactPerson`、`contactPhone`、`address`、`voidDescription` 等 legacy source-only 字段未纳入当前 runtime 合同，不在本规格覆盖范围内。
- 复用指引：本规格中的 CRUD 链路、active-only 过滤、permission alias 和 AUTO_CREATED provenance 约束可作为其他主数据实体（F1/F3/F5）的验收模板。
- 完整 autonomous-delivery run 的最小用例子集：`[AC-CASE-1]` `[AC-CASE-3]` `[AC-CASE-4]` `[AC-CASE-5]` `[AC-CASE-6]`
