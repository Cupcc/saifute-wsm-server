import { getToken } from "@/utils/auth";

/**
 * AI 聊天 API 服务
 * 接口: POST /ai/chat
 * 响应: text/event-stream (SSE)
 * 超时: 3 分钟
 *
 * SSE 事件推送顺序：
 *   event: message  → AI 文本流式输出（可能多条）
 *   event: action   → 操作指令（0~N 条，在文本之后推送）
 *   event: done     → 完成标记
 */

// 获取基础 API URL
function getBaseUrl() {
  return import.meta.env.VITE_APP_BASE_API;
}

/**
 * WMS 系统提示词 — 定义 AI 助手的身份和知识范围
 *
 * 注意：表单字段结构由前端 formSchemas 动态注入，
 * 不在此处硬编码，详见 src/constants/formSchemas.js
 */
export const WMS_SYSTEM_PROMPT = `你是一个专业的 WMS（仓库管理系统）智能助手，名字叫"小仓"。你的职责是帮助用户理解和使用仓库管理系统。

## 你的能力：
1. 解答系统各模块的功能和操作流程
2. 指导用户完成入库、出库、领料、退料等仓库操作
3. 帮助用户理解库存预警、生产报废管理、研发协同等功能
4. 回答仓库管理相关的业务问题
5. 帮助用户导航到指定页面
6. 帮助用户创建验收单、入库单、出库单、领料单等，并自动预填表单数据

## 系统功能地图：
- **入库管理**：验收单（到货验收）→ 验收明细 → 入库单（确认入库）→ 入库明细
- **库存管理**：库存查询、库存日志、库存预警、库存区间、已使用物料
- **生产车间**：领料单 → 领料明细 | 退料单 → 退料明细 | 报废单 → 报废明细
- **研发协同 / 研发小仓**：自动入库结果、研发项目、库存流水、研发工作台
- **基础数据**：客户管理、物料管理、人员管理、供应商管理、车间管理
- **物料管理**：物料信息、产品信息
- **报表中心**：库存分类报表、物料库存报表、物料分类库存、供应商对账
- **审计管理**：操作审计
- **系统管理**：用户、角色、部门、菜单、字典、参数、通知、岗位管理
- **系统监控**：操作日志、登录日志、在线用户、定时任务、服务监控、缓存监控

## 页面路由映射：
- /index → 首页仪表盘
- /entry/order → 验收单
- /entry/detail → 验收明细
- /entry/intoOrder → 入库单
- /entry/intoDetail → 入库明细
- /stock/inventory → 库存管理 / 库存查询
- /stock/warning → 库存预警
- /take/pickOrder → 生产领料单
- /take/returnOrder → 生产退料单
- /take/scrapOrder → 生产报废单
- /rd/workbench → 研发工作台
- /rd/inbound-results → 自动入库结果
- /rd/projects → 研发项目
- /base/customer → 客户管理
- /base/material → 物料管理
- /base/supplier → 供应商管理
- /base/workshop → 车间管理
- /report/inventoryCategory → 库存分类报表
- /report/supplierStatement → 供应商对账

## 回答要求：
- 回答简洁明了，使用中文
- 适当使用 Markdown 格式（标题、列表、粗体）让回答更清晰
- 如果用户提问与当前页面相关，优先结合页面上下文回答
- 如果不确定答案，请诚实告知并引导用户联系管理员`;

/**
 * 发送 AI 聊天消息（SSE 流式响应）
 *
 * @param {Object} params - 请求参数
 * @param {string} params.systemPrompt - 系统提示词
 * @param {string} params.pageContext - 当前页面上下文
 * @param {string} params.message - 用户本次发送的消息
 * @param {Array}  params.history - 对话历史 [{role, content}]
 * @param {Object} [params.formSchemas] - 表单字段 Schema（前端注入，后端用于构建 AI prompt）
 * @param {Function} onMessage - 收到文本片段回调 (data) => void
 * @param {Function} onAction - 收到操作指令回调 (action) => void
 * @param {Function} onDone - 回复完成回调 () => void
 * @param {Function} onError - 错误回调 (error) => void
 * @returns {AbortController} 可调用 .abort() 取消请求
 */
export function sendChatMessageStream(
  { systemPrompt, pageContext, message, history, formSchemas },
  onMessage,
  onAction,
  onDone,
  onError,
) {
  const controller = new AbortController();
  const token = getToken();

  fetch(`${getBaseUrl()}/ai/chat`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      systemPrompt,
      pageContext,
      message,
      history,
      formSchemas,
    }),
    signal: controller.signal,
  })
    .then(async (response) => {
      if (!response.ok) {
        const errorText = await response
          .text()
          .catch(() => response.statusText);
        throw new Error(`请求失败 (${response.status}): ${errorText}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let currentEvent = ""; // 当前事件类型

      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          // 流结束，如果还没收到 done 事件，也触发完成
          onDone?.();
          break;
        }

        buffer += decoder.decode(value, { stream: true });

        // 按行解析 SSE
        const lines = buffer.split("\n");
        buffer = lines.pop(); // 保留未完成的最后一行

        for (const line of lines) {
          const trimmed = line.trim();

          if (trimmed === "") {
            // 空行表示一个事件结束，重置事件类型
            currentEvent = "";
            continue;
          }

          // 解析 event: 行
          if (trimmed.startsWith("event:")) {
            currentEvent = trimmed.slice(6).trim();
            continue;
          }

          // 解析 data: 行
          if (trimmed.startsWith("data:")) {
            const dataStr = trimmed.slice(5).trim();

            // done 事件 — 回复完成
            if (currentEvent === "done" || dataStr === "[DONE]") {
              onDone?.();
              return;
            }

            // error 事件 — 错误
            if (currentEvent === "error") {
              try {
                const errorData = JSON.parse(dataStr);
                onError?.(new Error(errorData.message || "未知错误"));
              } catch {
                onError?.(new Error(dataStr || "未知错误"));
              }
              return;
            }

            // action 事件 — 操作指令
            if (currentEvent === "action") {
              try {
                const actionData = JSON.parse(dataStr);
                onAction?.(actionData);
              } catch (e) {
                console.warn("解析 action 事件失败:", dataStr, e);
              }
              continue;
            }

            // message 事件或默认事件 — AI 回复的文本片段
            if (
              currentEvent === "message" ||
              currentEvent === "" ||
              !currentEvent
            ) {
              try {
                const parsed = JSON.parse(dataStr);
                onMessage?.(parsed);
              } catch {
                // 非 JSON 数据，直接作为文本
                if (dataStr) {
                  onMessage?.({ content: dataStr });
                }
              }
            }
          }
        }
      }
    })
    .catch((error) => {
      if (error.name === "AbortError") {
        // 用户主动取消，不报错
        return;
      }
      onError?.(error);
    });

  return controller;
}
