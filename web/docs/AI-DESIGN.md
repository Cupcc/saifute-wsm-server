# AI 智能助手 - 后端设计文档

---

## 一、整体架构

```
前端 (Vue)                          后端 (Spring Boot)                     AI 中转商
   |                                      |                                   |
   |-- POST /ai/chat (SSE) ------------->|                                   |
   |   (含 formSchemas)                   |                                   |
   |                                      |-- 组装 messages + tools          |
   |                                      |   (formSchemas 注入 prompt)      |
   |                                      |-- HTTP 流式请求 ---------------->|
   |                                      |<-- SSE 流式响应 (text/tool_calls)|
   |                                      |                                   |
   |                                      |-- [如有 tool_calls]              |
   |                                      |   查询工具：执行查询，结果注入    |
   |                                      |   操作工具：构建 action 事件      |
   |                                      |   再次调用 AI ------------------>|
   |                                      |<-- SSE 流式响应 ----------------|
   |                                      |                                   |
   |<-- event: message (流式文本片段) ----|                                   |
   |<-- event: action  (操作指令)    ----|                                   |
   |<-- event: done    (完成标记)    ----|                                   |
```

**关键设计决策**：表单字段结构（formSchemas）由前端维护并随请求发送，后端将其注入 AI 的 system prompt 中。AI 无需额外工具调用即可知道表单结构，直接一步构造 `open_form` 指令。

## 二、文件结构

```
com.saifute.ai
├── config
│   └── AiProxyConfig.java          # AI 中转商配置（baseUrl, apiKey, model, type）
├── controller
│   └── AiChatController.java       # SSE 流式聊天接口 POST /ai/chat
├── dto
│   ├── AiChatRequest.java          # 前端请求体（含 formSchemas）
│   ├── AiChatMessage.java          # 对话消息（含 ToolCall 内部类）
│   └── AiActionEvent.java          # 操作事件（页面跳转 / 表单预填）
└── service
    ├── AiConfigService.java        # 从 sys_config 表读取 AI 配置
    ├── AiProviderClient.java       # HTTP 客户端，调用 OpenAI 兼容 API（流式 + Function Calling）
    ├── AiChatService.java          # 核心编排服务（多轮工具调用 + SSE 推送 + formSchemas 注入）
    └── AiToolExecutor.java         # 工具定义 + 执行（查询工具 + 操作工具）
```

## 三、接口协议

### 3.1 请求

```
POST /ai/chat
Content-Type: application/json
Accept: text/event-stream
```

请求体 `AiChatRequest`：

| 字段           | 类型                      | 必填 | 说明                                         |
| ------------ | ----------------------- | -- | ------------------------------------------ |
| systemPrompt | String                  | 是  | 系统提示词（前端构建，描述 AI 身份和业务逻辑）               |
| pageContext  | String                  | 是  | 当前页面上下文（前端根据路由自动生成）                      |
| message      | String                  | 是  | 用户本次发送的消息                                  |
| history      | List\<AiChatMessage\>   | 是  | 对话历史（之前的 user / assistant 消息）              |
| formSchemas  | Map\<String, Object\>   | 是  | **前端表单字段定义**，key 为路由路径，value 为字段结构        |

#### formSchemas 说明

`formSchemas` 由前端维护（定义在 `src/constants/formSchemas.js`），包含所有支持 AI 预填的表单字段结构。后端收到后**将其注入 AI 的 system prompt**，使 AI 能直接返回正确的 `formData`。

结构示例：

```json
{
  "/entry/order": {
    "formName": "验收单",
    "mainFields": {
      "supplierName": { "label": "供应商", "type": "string", "hint": "填写供应商名称，系统自动模糊匹配", "example": "华东皮革" },
      "workshopName": { "label": "关联部门", "type": "string", "hint": "填写部门或车间名称，系统自动匹配" },
      "attn": { "label": "经办人", "type": "string" },
      "chargeBy": { "label": "负责人", "type": "string" },
      "remark": { "label": "备注", "type": "string" }
    },
    "detailFields": {
      "materialName": { "label": "物料名称", "type": "string", "hint": "填写物料名称或编码，系统自动模糊搜索匹配", "required": true, "example": "靴子" },
      "quantity": { "label": "验收数量", "type": "number", "required": true, "example": "100" },
      "unitPrice": { "label": "单价", "type": "number", "hint": "可不填，系统会自动查询最近采购价" },
      "taxPrice": { "label": "含税价", "type": "number" },
      "remark": { "label": "明细备注", "type": "string" }
    },
    "hint": "主表字段放在 formData 顶层，明细行数据放在 formData.details 数组中，每个明细至少包含 materialName 和 quantity"
  },
  "/entry/intoOrder": { "formName": "入库单", "..." : "..." },
  "/take/pickOrder": { "formName": "领料单", "..." : "..." }
}
```

当前支持 3 种表单：

| 路由路径               | 表单名 | 主表字段                                           | 明细字段                                          |
| -------------------- | --- | ------------------------------------------------ | ------------------------------------------------ |
| `/entry/order`     | 验收单 | supplierName, workshopName, attn, chargeBy, remark | materialName, quantity, unitPrice, taxPrice, remark |
| `/entry/intoOrder` | 入库单 | workshopName, attn, chargeBy, remark               | materialName, quantity, unitPrice, remark           |
| `/take/pickOrder`  | 领料单 | workshopName, picker, chargeBy, remark             | materialName, quantity, remark                      |

> **扩展新表单**：前端在 `formSchemas.js` 中新增一个路由 key，后端和 AI 侧**零改动**。

### 3.2 响应（SSE 事件流）

后端以 SSE 事件流的形式推送响应，事件按以下顺序推送：

| 事件名       | 推送时机     | data 格式              | 说明            |
| --------- | -------- | -------------------- | ------------- |
| `message` | AI 回复过程中 | `{"content":"部分文本"}` | 流式文本片段，可能推送多次 |
| `action`  | 文本推送完毕后  | 见下方 action 结构        | 操作指令，0~N 条    |
| `done`    | 最后       | `{}`                 | 回复完成标记        |
| `error`   | 出错时      | `{"message":"错误信息"}` | 发生错误          |

#### action 事件结构 (`AiActionEvent`)

| 字段       | 类型     | 必填              | 说明                                      |
| -------- | ------ | --------------- | --------------------------------------- |
| type     | String | 是               | `navigate`（页面跳转）或 `openForm`（打开表单并预填数据） |
| path     | String | 是               | 目标路由路径，如 `/entry/order`                 |
| label    | String | 是               | 操作按钮显示文字，如 "去创建验收单（预填：靴子×100）"          |
| formData | Object | openForm 时必填     | 表单预填数据                                  |

**formData 结构规则**：

1. **主表字段**放在 `formData` 顶层，字段名与 `formSchemas.mainFields` 的 key 一致
2. **明细行**放在 `formData.details` 数组中，每个元素的字段名与 `formSchemas.detailFields` 的 key 一致
3. **每条明细至少包含** `materialName`（字符串）和 `quantity`（数字）
4. **用户没提到的字段不要编造**，留空即可
5. `quantity` 必须是数字类型（`100`），不能是字符串（`"100"`）

**navigate 示例：**

```json
event: action
data: {"type":"navigate","path":"/stock/inventory","label":"查看库存"}
```

**openForm 示例：**

```json
event: action
data: {
  "type": "openForm",
  "path": "/entry/order",
  "label": "去创建验收单（预填：靴子×100）",
  "formData": {
    "supplierName": "华东皮革",
    "details": [
      { "materialName": "靴子", "quantity": 100 }
    ]
  }
}
```

## 四、核心流程

### 4.1 多轮工具调用编排（AiChatService.handleChat）

```
                    ┌──────────────────────────────────────────────┐
                    │              组装 messages                    │
                    │  system(prompt + pageContext                 │
                    │         + formSchemas prompt + action指引)   │
                    │  + history + user message                    │
                    └──────────────────┬───────────────────────────┘
                                       │
                    ┌──────────────────▼───────────────────────────┐
              ┌────>│         调用 AI（流式 + tools）               │
              │     │  文本内容通过 callback 推送 event: message    │
              │     └──────────────────┬───────────────────────────┘
              │                        │
              │          AI 返回了 tool_calls?
              │            │                │
              │           否               是
              │            │                │
              │            ▼                ▼
              │      跳出循环        分离 action 工具 / 查询工具
              │                        │
              │              ┌─────────┴──────────┐
              │              │                    │
              │        查询工具               操作工具
              │     (query_*)            (navigate_page
              │                           open_form)
              │              │                    │
              │        执行查询              收集为 AiActionEvent
              │        结果注入 messages      (稍后推送)
              │              │                    │
              │              └─────────┬──────────┘
              │                        │
              │              有查询工具？
              │            │           │
              │           是          否（只有 action）
              │            │           │
              └────────────┘       跳出循环
                                       │
                    ┌──────────────────▼───────────────────────────┐
                    │          推送 action 事件 (0~N 条)            │
                    │          推送 done 事件                       │
                    └──────────────────────────────────────────────┘
```

最多循环 3 轮（`MAX_TOOL_ROUNDS = 3`），防止无限工具调用。

### 4.2 表单预填完整流程

当用户说"帮我创建验收单，从华东皮革进100双靴子"时：

```
第 1 轮：AI 已从 prompt 中获知表单字段结构（formSchemas），直接返回：
         - 文本回复："好的，我来帮你创建验收单..."
         - open_form(path="/entry/order",
                     label="去创建验收单（预填：靴子×100）",
                     formData={
                       supplierName: "华东皮革",
                       details: [{ materialName: "靴子", quantity: 100 }]
                     })
         → 后端将 open_form 转为 SSE action 事件推送给前端

前端收到 action 事件 → 显示操作按钮 → 用户点击 → 跳转验收单页面 → 自动预填表单
```

与查询结合的复杂场景：

```
用户："我想补货库存不足的物料"

第 1 轮：AI 调用 query_inventory_warning()
         → 后端查询数据库返回预警列表
         → AI 获得预警物料信息

第 2 轮：AI 结合预警数据 + formSchemas 中的字段结构，返回：
         - 文本回复："以下物料库存不足，我已为您预填了验收单..."
         - open_form(path="/entry/order", formData={
             details: [
               { materialName: "靴子", quantity: 200 },
               { materialName: "大衣", quantity: 100 }
             ]
           })
```

## 五、工具列表

工具分为两类：**查询工具**和**操作工具**。

> 注意：原设计中的 `get_form_schema` 工具已移除。表单字段结构由前端通过 `formSchemas` 随请求传入，后端注入 prompt，AI 无需额外工具调用即可获知。

### 5.1 查询工具（执行数据库查询，结果返回给 AI）

| 工具名                       | 说明       | 参数                         |
| ------------------------- | -------- | -------------------------- |
| `query_inventory`         | 查询物料库存信息 | materialName, materialCode |
| `query_material`          | 搜索物料基础信息 | keyword                    |
| `query_inventory_warning` | 查询库存预警列表 | 无                          |
| `query_inbound_orders`    | 查询验收单列表  | inboundNo, supplierName    |
| `query_outbound_orders`   | 查询出库单列表  | outboundNo, customerName   |
| `query_pick_orders`       | 查询领料单列表  | pickNo                     |

### 5.2 操作工具（不执行查询，转换为 SSE action 事件推送给前端）

| 工具名             | 说明        | 参数                    | action type |
| --------------- | --------- | --------------------- | ----------- |
| `navigate_page` | 引导用户跳转页面  | path, label           | navigate    |
| `open_form`     | 打开表单并预填数据 | path, label, formData | openForm    |

操作工具与查询工具的区别：

- 查询工具：后端执行数据库查询，结果作为 tool result 返回给 AI，AI 继续对话
- 操作工具：后端**不执行查询**，将参数转换为 `AiActionEvent`，通过 SSE `action` 事件推送给前端

## 六、AI 配置

配置信息存储在 `sys_config` 表中，通过 `AiConfigService` 读取：

| 配置键              | 说明        | 示例                                                       |
| ---------------- | --------- | -------------------------------------------------------- |
| ai.proxy.baseUrl | AI 接口基础地址 | [https://api.openai.com/v1/](https://api.openai.com/v1/) |
| ai.proxy.apiKey  | API 访问令牌  | sk-xxx                                                   |
| ai.proxy.model   | 默认模型名称    | gpt-4o                                                   |
| ai.proxy.type    | 接口协议类型    | openai                                                   |

## 七、System Prompt 组成

后端在每次请求中自动组装 system message，结构如下：

```
[前端传入的 systemPrompt]                  ← 描述 AI 身份和业务逻辑
[当前用户所在页面: pageContext]             ← 前端根据路由自动生成
[后端追加的 formSchemas prompt]            ← 将前端 formSchemas 转为文本注入（见 7.1）
[后端追加的 ACTION_SYSTEM_PROMPT]          ← 告知 AI 何时使用操作工具（见 7.2）
```

### 7.1 formSchemas 注入 prompt

后端收到前端传入的 `formSchemas` 后，将其转换为文本拼接到 system prompt 中：

```java
private String buildSchemaPrompt(Map<String, Object> formSchemas) {
    if (formSchemas == null || formSchemas.isEmpty()) {
        return "";
    }

    StringBuilder sb = new StringBuilder();
    sb.append("## 可用的表单及其字段结构：\n\n");

    // 将 formSchemas 序列化为 JSON 并嵌入
    String schemasJson = JSON.toJSONString(formSchemas, JSONWriter.Feature.PrettyFormat);
    sb.append("```json\n").append(schemasJson).append("\n```\n\n");

    sb.append("### formData 填写规则：\n");
    sb.append("1. formData 中主表字段放顶层，明细放 formData.details 数组\n");
    sb.append("2. 每条明细至少包含 materialName（string）和 quantity（number）\n");
    sb.append("3. quantity 必须是数字类型，不要加引号\n");
    sb.append("4. 用户没提到的字段不要编造，留空即可\n");
    sb.append("5. 字段名必须与上面 schema 中的 key 完全一致\n");

    return sb.toString();
}
```

### 7.2 ACTION_SYSTEM_PROMPT

```
## 页面导航与表单操作能力

你具备帮助用户跳转页面和打开表单的能力。请在以下场景使用对应工具：

### navigate_page（页面跳转）
当用户表达想要去某个页面或查看某个列表时使用。

### open_form（打开表单并预填数据）
当用户表达想要创建或新增某条记录时使用。
你已经从上面的「可用的表单及其字段结构」中获知了每种表单的字段定义，
根据字段结构中的 mainFields 和 detailFields 构造 formData 即可，
不需要额外查询表单结构。

### action 示例
用户说："帮我创建一个验收单，100个靴子"
→ open_form(path="/entry/order", label="去创建验收单（预填：靴子×100）",
     formData={"details":[{"materialName":"靴子","quantity":100}]})

用户说："从华东皮革进200双靴子和50件大衣，经办人张三"
→ open_form(path="/entry/order", label="去创建验收单（预填：靴子×200, 大衣×50）",
     formData={"supplierName":"华东皮革","attn":"张三",
       "details":[{"materialName":"靴子","quantity":200},{"materialName":"大衣","quantity":50}]})

### 使用规则
1. formData 字段名必须与 formSchemas 中的 key 一致
2. 如果用户只是问问题，不需要创建单据，则不使用 open_form
3. 可以同时返回文字回复和操作工具调用
4. navigate 类型不需要 formData
```

## 八、后端适配清单

| # | 事项 | 优先级 | 说明 |
|---|------|--------|------|
| 1 | AiChatRequest 新增 `formSchemas` 字段 | **高** | `Map<String, Object>` 类型 |
| 2 | buildMessages 中将 `formSchemas` 注入 prompt | **高** | 调用 `buildSchemaPrompt()`，拼在 systemPrompt 之后 |
| 3 | 移除 `get_form_schema` 工具及相关反射代码 | **高** | 从 getToolDefinitions() 移除，删除 FORM_REGISTRY / reflectFields 等 |
| 4 | action 事件必须包含 `formData` | **高** | openForm 类型缺少 formData 前端无法预填 |
| 5 | formData 字段名与 formSchemas 的 key 一致 | **高** | 由 AI prompt 约束，如 `supplierName` 不能写成 `supplier` |
| 6 | ACTION_SYSTEM_PROMPT 更新 | **中** | 移除 "先调用 get_form_schema" 的指引，改为直接使用 formSchemas |
| 7 | quantity 使用数字类型 | 中 | `100` 而非 `"100"` |
| 8 | 未提及的字段不要编造 | 中 | AI 倾向于补全，需在 prompt 中约束 |

## 九、问题排查记录

### 9.1 open_form 返回 formData=null（2026-02-08）

**现象**：用户输入"创建验收单，100个靴子"，AI 调用了 `open_form` 但 `formData` 为空，前端无法预填表单。

**日志关键信息**：

```
formSchemas 已注入 prompt，长度: 3789 字符
tool_call[0] 最终参数: name=open_form, arguments={"label":"去创建验收单（预填：靴子×100）","path":"/entry/order"}
open_form 缺少 formData！AI 模型未返回该参数。args 包含的 key: [label, path]
```

**根因**：AI 模型（gpt-5.2）返回的 tool_call arguments 中**根本没有 `formData` 字段**，只返回了 `label` 和 `path`。不是前端问题（formSchemas 已注入），也不是后端解析问题。

排除项：

- ~~前端未传 formSchemas~~ → 日志确认已注入 3789 字符
- ~~后端解析 formData 失败~~ → arguments JSON 中根本没有 formData 这个 key
- **确认**：AI 模型跳过了 formData 参数

**原因分析**：

1. `paramObj()` 生成的 JSON Schema 只有 `{"type":"object","description":"..."}` 没有 `properties`，AI 不知道该填什么结构
2. formData 描述中跨引用 system prompt 中的 formSchemas，间接性太强
3. system prompt 中对 formData 必填的强调不够

**修复方案**（三处改动）：

| 文件 | 改动 | 说明 |
|------|------|------|
| `AiProviderClient.java` | 移除逐片段 DEBUG 日志 | 减少日志噪音，只保留最终合并的 INFO 日志 |
| `AiToolExecutor.java` | 新增 `paramObjWithDetails()` 方法 | 给 formData 增加明确的 `properties` 结构（含 details 数组、materialName、quantity），并在工具描述中强调 formData 必填 |
| `AiChatService.java` | 强化 `ACTION_SYSTEM_PROMPT` | 用加粗文字和具体示例强调 open_form 必须包含 formData |
