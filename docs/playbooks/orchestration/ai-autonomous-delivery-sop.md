# AI 自主交付 SOP

适用场景：

- 用户要求 AI 端到端完成一个需求、主题或完整项目切片
- 用户要求“你直接做完并判断是否完成”
- 最终交付需要一份可审计的完整测试报告

这份 SOP 约束的是“如何让 AI 不只写代码，还能证明需求已经完成”。

## 1. 进入条件

在进入 `coder` 之前，以下条件必须成立：

1. 已有 `confirmed` 的 topic 能力合同（`docs/requirements/topics/*.md` 对应的 `Fx` 能力）。
2. 该能力合同已明确：
   - `In scope`
   - `Out of scope / non-goals`
   - `[AC-*]` 或 `[TC-*]` 编号化验收标准
   - 每条标准的证据类型期待
   - `Completion criteria`（完成定义）
3. 已创建 task doc，Metadata 中 `Related requirement` 指向 topic 能力，`Delivery mode` 设为 `autonomous`。
4. 对非 trivial scope，`Acceptance mode` 默认设为 `full`。

如果上述任一条件缺失，不应让 AI 直接进入”写代码并宣称完成”。

## 2. Topic 能力合同怎么写

能力合同不是散文 PRD，而是判定合同。最小结构（写在 `topics/*.md` 对应 `Fx` 能力合同块中）：

- `In scope`
- `Out of scope / non-goals`
- `Completion criteria`（`[TC-*]` 编号）
- `Evidence expectation`
- `Default derived slice acceptance mode`

写法约束：

- `[AC-*]` 必须是业务可读、可判定的结果，不写实现步骤
- `Out of scope / non-goals` 必须明确，避免 AI 自行扩 scope
- `验收证据要求` 只写证据类型，不写具体执行步骤
- `完成定义` 必须区分“完成”“有条件通过”“阻塞”

## 2.1 Topic-First 模式（标准模式）

需求真源统一维护在 `topics/*.md`，不再使用切片 `req-*.md`。

此模式下：

1. `topics/*.md` 承担”长期合同锚点”职责，每个未完成能力需补齐：
   - `In scope`
   - `Out of scope / non-goals`
   - `Completion criteria`
   - `Evidence expectation`
   - `Default acceptance mode`
2. AI 在执行前，直接从 confirmed topic 能力合同创建 `task-*.md`，在 Metadata 中填 `Related requirement: docs/requirements/topics/*.md (Fx)`。
3. 不再创建中间切片 `req-*.md`；topic 能力合同就是判定合同。

只有在以下条件同时满足时，AI 才能直接开 task：

1. topic 已 `confirmed`
2. topic 中存在一个明确的未完成能力
3. 该能力合同已经足够明确
4. 派生时不需要发明新的业务语义或跨 topic 扩 scope

否则，应先停下来澄清。

## 3. 标准交付流

默认执行顺序：

1. `topic` 能力合同确认（`In scope / AC / Evidence / Done definition` 已齐）
2. `planner` 产出 task doc（Metadata 中 `Related requirement` 指向 topic 能力）
3. `coder` 实现
4. `code-reviewer` 复核并补齐测试缺口
5. `acceptance-qa` 生成或更新 acceptance spec
6. `acceptance-qa` 更新 spec 中的 `Latest Verification`，必要时再生成 acceptance run
7. 若有失败项，回到 `planner` / `coder` / `code-reviewer`
8. 当前验收记录（默认是 spec 的 `Latest Verification`，必要时是独立 acceptance run）达到可签收状态后，才允许宣称“完成”

其中：

- `acceptance spec` 回答“这类需求以后应该怎么测”
- `acceptance spec` 默认还记录“最近一次实际验证结果是什么”
- `acceptance run` 只在需要独立、冻结、复杂或审计型报告时回答“这次具体测了什么、结果如何、能否签收”

## 4. 完整测试报告要求

在自主交付模式下，完整测试报告默认写在 acceptance spec 的 `Latest Verification`；当报告明显过长、需要冻结快照、存在复杂阻塞证据，或用户明确要求独立报告时，再额外创建 `docs/acceptance-tests/runs/run-*.md`。最少要包含：

- 报告范围：关联 requirement、task、spec、环境、版本
- 覆盖矩阵：每个 `[AC-*]` 对应哪些 case
- 环境准备：账号、数据、入口、外部依赖、是否 ready（本地 QA 默认 `.env.dev`，与 `pnpm dev` 一致；Prisma / e2e 等见 `docs/acceptance-tests/README.md`「本地 QA 与 `.env.dev`」）
- 执行结果：逐 case 的预期、实际、证据、结果
- 回归结果：自动化测试、静态检查、浏览器/手工验证、数据验证
- 缺陷与阻塞：失败项、环境缺口、后续 owner
- 最终建议：`accept` | `reject` | `conditional` | `block`
- 残余风险：不阻断签收但需要明确写出的风险

## 5. 完成判定

只有当以下条件同时满足时，AI 才能把任务判定为“已完成”：

1. 所有 in-scope `[AC-*]` 都有明确最终 verdict。
2. 没有被隐藏的 `blocked` 或未说明的环境缺口。
3. 当前完整测试报告已产出，并可作为签收依据交付。
4. requirement 的 `验收状态` 已同步为聚合结论。
5. task doc、acceptance spec、requirement 三者结论一致；如果存在独立 `acceptance run`，其结论也必须一致。

以下情况不算完成：

- 只有代码修改，没有验收结论
- 只有 `pnpm test` 通过，没有业务 `[AC-*]` 对应的 case 结果
- 环境不具备，但未在报告中明确标记为 `blocked`
- 只说“理论上应该可以”，没有证据

## 6. 推荐判定语义

- `accept`：所有 `[AC-*]` 满足，证据完整，可签收
- `conditional`：主标准已满足，但存在已知轻微缺口或后续 follow-up，不阻断当前签收
- `reject`：存在明确未满足的 `[AC-*]`
- `block`：当前无法完成真实验收，原因是环境、数据、权限或依赖未就绪

## 7. 最小落地规则

如果不想一开始就把所有任务都推到最重流程，至少执行这三条：

1. 没有 `[AC-*]` 的 requirement，不进入 coder。
2. 用户要求“完整测试报告”时，`Acceptance mode` 必须为 `full`。
3. 没有当前有效的完整测试报告（默认是 spec 的 `Latest Verification`，必要时是独立 acceptance run），不宣称需求闭环。
4. 如果 topic 能力合同信息不完整（缺少 `In scope / Out of scope / AC / Evidence`），不进入 coder，先补齐 topic 合同。
