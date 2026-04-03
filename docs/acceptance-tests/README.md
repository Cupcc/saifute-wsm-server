# 验收测试文档

`docs/acceptance-tests/**` 保存 `full` 模式验收测试资产。这里的重点不是替代 task 文档，而是在 task 文档内证据已经不够用时，提供可复用、可追溯的验收测试层。

默认情况下，由 `spec` 同时承担两件事：

- 回答“这类需求应该怎么测”
- 记录“最近一次实际验证结果是什么”

如果这次没有新增测试，就保留 `spec` 里的上一次“最近一次验证”（`Latest Verification`）；如果有新增测试，就直接更新它。只有在需要独立、冻结、复杂或审计型完整报告时，才额外创建 `run`。

## 什么时候用

- `验收模式 = none`：不使用本目录。
- `验收模式 = light`：默认不使用本目录，优先把验收记录写在 task 文档的 `## Acceptance`。
- `验收模式 = full`：默认使用 `spec`；`run` 仅在确有必要时由 `acceptance-qa` 额外创建。

## 本地 QA 与 `.env.dev`

验收、手工联调、以及需要连本机 MySQL / Redis 的自动化步骤，**默认与 `pnpm dev` 对齐，使用仓库根目录的 `.env.dev`**（个人覆盖可仍用未提交的 `.env`，但不要把它当作团队对齐面）。

| 场景 | 说明 |
| --- | --- |
| 启动后端 | `pnpm dev` 已带 `--env-file .env.dev`，无需额外指定。 |
| Prisma（`db push` / migrate 等需 `DATABASE_URL`） | 在 bash/zsh 下先导出变量再执行，例如：`set -a && source .env.dev && set +a && pnpm prisma db push --schema prisma/schema.prisma` |
| 需要显式注入环境变量的脚本 | 与迁移脚本一致：`cross-env DOTENV_CONFIG_PATH=.env.dev …`（见 `package.json` 中 `migration:*`）。 |
| `pnpm test:e2e` | 脚本本身不自动加载 `.env.dev`；若某条用例需要真实 DB/Redis，在运行前于同一 shell `source .env.dev`（或按需导出变量）。部分 e2e 会 `env -u …` 清空变量以使用内存 stub，与「真实环境」跑法不同，以用例意图为准。 |

在 `full` 模式的 `runs/run-*.md` 里，**环境准备**应写明实际使用的 env 文件（推荐写 `.env.dev`）以及本机 MySQL/Redis 是否就绪，避免将「环境未就绪」误判为实现缺陷。

## `environment-gap` 判定口径

只有在下面证据都具备时，才可把阻塞归类为 `environment-gap`：

- 已在**实际失败执行面**直接复现，例如浏览器验收依赖 `pnpm dev`，就必须先复现 `pnpm dev` 启动失败，而不是只看相邻模式（如 e2e、脚本探针、单独 Redis ping）。
- 已记录**原始失败证据**，包括执行命令、使用的 env 文件、关键依赖状态、原始报错或日志片段。
- 已补充至少一个**对照证据**，说明失败只发生在特定执行面，而不是所有相关路径都失败。
- 已说明为什么当前证据足以排除仓库内实现、配置解析、脚本参数或默认值问题；若还不能排除，则先记为 `evidence-gap` 或继续排查，不要提前标 `environment-gap`。

若任务目标是“完成交付”而非“仅实现代码”，则浏览器、dev server、联调链路中的阻塞不能因为“看起来像环境问题”就提前停下。应先把阻塞定位到最小可行动根因，再决定是回到 `coder`、交给环境 owner，还是继续验收。

## 目录布局

```text
docs/acceptance-tests/
├── README.md
├── specs/
│   ├── _template.md
│   └── *.md
└── runs/
    ├── _template.md
    └── run-*.md（可选）
```

## 两类资产

- `specs/**`
  - 长期维护的验收测试规格。
  - 回答“这个模块或这类需求应该怎么测”。
  - 默认还要包含“最近一次验证”（`Latest Verification`），记录最近一次测试范围、结果、证据与残余风险。
  - 适合模块级、主题级、跨任务复用的测试用例。
- `runs/**`
  - 可选的独立执行报告。
  - 只在需要冻结某次基线、保留复杂阻塞证据、输出独立完整报告或满足审计/交接要求时使用。
  - 不作为默认必选资产。

## 命名建议

- `specs/<module-or-topic>.md`
- `runs/run-YYYYMMDD-HHMM-<scope>.md`（仅在确有必要时创建）

## 关键规则

- `spec` 是默认主文档，也是长期资产，默认不随单个 task 归档。
- `spec` 中的“最近一次验证”（`Latest Verification`）只保留最近一次结果，不维护额外历史摘要。
- 没有新测试时，保留上一次“最近一次验证”，不要伪造“已重新验证”。
- 有新测试时，直接更新“最近一次验证”，明确本次实际覆盖的 case 与证据。
- `run` 不是强制项；是否创建由 `acceptance-qa` 按证据复杂度与交付需求自行决策。
- 当用户明确要求“完整测试报告”，或需要冻结一次独立验收基线、保留复杂阻塞证据、满足审计/交接要求时，应创建 `run`。
- 如果创建了 `run`，`spec` 仍应同步最新结论，至少在“最近一次验证”中写明当前结果与 `run` 路径。
- 环境不就绪时，将当前验收记录标记为 `blocked`，并记录证据；只有满足上面的判定口径后，才可正式标记为 `environment-gap`，不要误判成实现缺陷或过早把仓库内问题推出边界。
- case 选择必须满足最小覆盖基线，不能随意挑顺手的 case。
- 只要 agent 验收或测试需要真实浏览器操作，使用 `agent-browser` skill 作为默认执行面。若当前运行面 skill 不可用，则直接执行 `agent-browser` CLI；若 CLI 仍不可用或受阻，再回退到 **Chrome DevTools MCP** 浏览器能力，并在 task / spec 中写明所用通道与回退原因。避免未说明的临时混用，以免执行证据与操作口径漂移。
- 需要实际操作步骤、证据写法或故障排查时，优先参考上述两个 skill 的注入内容；不要再引用已删除的 repo-local browser playbook。
- 如果用户要求“完整测试报告”，可直接写进 `spec` 的“最近一次验证”；只有当报告明显过长、需要冻结快照或需要单独留档时，才拆成 `run`。

## 最小覆盖基线

- `light` 模式：覆盖所有范围内 `[AC-*]` 与关键风险点即可，通常留在 task 文档。
- `full` 模式：至少覆盖所有范围内 `[AC-*]`、受影响主流程、相关 `regression-critical` case，以及明确标记的 `high-risk` case。

## “最近一次验证”（`Latest Verification`）最少应包含

- 最近一次测试时间与关联 task
- 本次实际覆盖的 `[AC-*]` / case 范围
- 环境与关键执行面
- 最终结果：`通过（passed）` | `部分完成（partial）` | `阻塞（blocked）` | `未执行（not-run）`
- 关键证据来源
- 每个范围内 `[AC-*]` 的结论
- 残余风险或阻塞说明

## 推荐写法：三段式结构

为了让“最近一次验证”更清晰、结构化，推荐固定为下面三段：

1. `验证摘要`（`Verification Summary`）
   - 用一个短表概括最近一次验证的时间、task、范围、环境、总结果。
2. `验收矩阵`（`Acceptance Matrix`）
   - 这是主表，按 `[AC-*]` 一行一个验收标准。
   - 推荐列：`验收标准` | `覆盖用例` | `执行面` | `关键证据` | `结论` | `备注`
   - `结论` 只用固定词汇：`满足（met）` | `部分满足（partially met）` | `不满足（not met）` | `阻塞（blocked）`
3. `证据摘要`（`Evidence Summary`）
   - 按执行面汇总证据来源，避免把命令、测试文件、浏览器验证散落在正文里。
   - 推荐列：`执行面` | `证据` | `结果` | `备注`

## 矩阵表设计建议

- 一行只对应一个 `[AC-*]`，不要在同一行里混多个验收标准。
- `覆盖用例` 只写 case ID，保持紧凑；详细步骤继续留在“验收用例”（`Acceptance Cases`）。
- `执行面` 优先写执行面类别，例如 `unit`、`e2e`、`browser`、`db/schema`，而不是长句描述。
- `关键证据` 只写最关键的测试文件、命令或截图来源，不要把完整日志搬进表格。
- `备注` 只写影响签收判断的信息，例如环境阻塞、剩余风险、后续补跑条件。
- 如果某个验收标准部分满足，优先在 `备注` 里写清“已验证部分”和“未验证部分”。

## 单独 `run` 最少应包含

- 报告范围：关联需求、task、spec、环境与待测版本
- 本次为何需要独立 `run`
- 逐 case 执行结果与关键证据
- 阻塞、环境缺口与后续 owner
- 最终建议：`accept` | `reject` | `conditional` | `block`
- 残余风险

权威来源：`.cursor/agents/acceptance-qa.md`（验收判定语义与报告格式）、`.cursor/skills/saifute-subagent-orchestration/SKILL.md`（交付流程与完成协议）。
