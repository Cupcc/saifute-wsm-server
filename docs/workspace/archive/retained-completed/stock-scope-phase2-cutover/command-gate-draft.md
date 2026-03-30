# Command Gate Draft

> 这里先沉淀命令级草案，后续 execution slice 再把它们收敛成真实 runbook。

## 1. Schema / Client Gate

```bash
pnpm prisma:generate
pnpm typecheck
```

目的：

- 验证 Prisma schema / client 生成后，应用仍可编译
- 尽早暴露 repository / DTO / query contract 的断裂

## 2. Focused Test Gate

首波建议至少覆盖：

```bash
pnpm test -- --runTestsByPath \
  src/modules/inventory-core/application/inventory.service.spec.ts \
  src/modules/reporting/application/reporting.service.spec.ts \
  src/modules/inbound/application/inbound.service.spec.ts \
  src/modules/customer/application/customer.service.spec.ts \
  src/modules/workshop-material/application/workshop-material.service.spec.ts \
  src/modules/project/application/project.service.spec.ts
```

目的：

- 先证明首波单据家族和库存核心没有因为存储轴切换产生明显回归

## 3. E2E / Stub Gate

建议至少覆盖：

```bash
pnpm test -- test/app.e2e-spec.ts
pnpm test -- test/batch-d-slice.e2e-spec.ts
```

目的：

- 校验 `PrismaE2eStub` / fixture / export / AI tool / reporting 链路仍可工作

## 4. Full Gate

```bash
pnpm swagger:metadata
pnpm typecheck
pnpm test
```

目的：

- 作为 cutover 前后的最终统一闸门

## 5. 待 execution slice 补齐

- DB clone 上的 migration / backfill / replay 实际命令
- reconciliation SQL 运行顺序
- maintenance-window 前后的 smoke 脚本
- rollback 后的最小验证命令
