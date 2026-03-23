/**
 * AI 操作通信 Store
 * 用于 AI 助手与业务页面之间的跨组件通信
 *
 * 工作流程：
 * 1. AI 助手收到 openForm action → 用户点击操作卡片
 * 2. 将 action 数据存入此 store → 导航到目标页面
 * 3. 目标页面 onActivated 时读取并消费 action → 打开表单 + 预填数据
 */
const useAiActionStore = defineStore("aiAction", {
  state: () => ({
    /** 待执行的操作 { type, path, label, formData } */
    pendingAction: null,
  }),
  actions: {
    /** 设置待执行操作 */
    setPendingAction(action) {
      this.pendingAction = action;
    },
    /** 消费待执行操作（读取后清除） */
    consumeAction() {
      const action = this.pendingAction;
      this.pendingAction = null;
      return action;
    },
  },
});

export default useAiActionStore;
