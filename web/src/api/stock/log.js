import {
  getInventoryLog,
  listInventoryLogs,
  unsupportedStockAction,
} from "./compat";

// 查询库存变动日志列表
export function listLog(query) {
  return listInventoryLogs(query);
}

// 查询库存变动日志列表（包含物料、库位、仓库信息）
export function listLogVo(query) {
  return listInventoryLogs(query);
}

// 查询库存变动日志详细
export function getLog(logId) {
  return getInventoryLog(logId);
}

// 新增库存变动日志
export function addLog() {
  return unsupportedStockAction("当前 NestJS 后端未提供库存日志手工新增接口");
}

// 修改库存变动日志
export function updateLog() {
  return unsupportedStockAction("当前 NestJS 后端未提供库存日志修改接口");
}

// 删除库存变动日志
export function delLog() {
  return unsupportedStockAction("当前 NestJS 后端未提供库存日志删除接口");
}
