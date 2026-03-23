/**
 * 通用单号生成工具函数
 */

/**
 * 生成单号
 * @param {Date} date - 日期对象
 * @param {string} prefix - 单号前缀
 * @param {Function} listFunction - 查询列表的API函数
 * @param {Object} params - 查询参数
 * @param {string} noField - 单号字段名
 * @returns {Promise<string>} 生成的单号
 */
export async function generateOrderNo(
  date,
  prefix,
  listFunction,
  params,
  noField = "orderNo",
) {
  // 生成日期部分
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const datePart = `${year}${month}${day}`;

  // 基础单号格式
  const baseOrderNo = `${prefix}${datePart}`;

  try {
    const response = await listFunction(params);
    const orders = response.rows || [];

    // 过滤出当天的单号并找出最大流水号
    let maxSerial = 0;
    orders.forEach((order) => {
      if (order[noField] && order[noField].startsWith(baseOrderNo)) {
        const serialPart = order[noField].substring(baseOrderNo.length);
        const serial = parseInt(serialPart, 10);
        if (!isNaN(serial) && serial > maxSerial) {
          maxSerial = serial;
        }
      }
    });

    // 生成新的流水号
    const newSerial = String(maxSerial + 1).padStart(3, "0");
    return `${baseOrderNo}${newSerial}`;
  } catch (error) {
    // 如果查询失败，默认使用001作为流水号
    console.error(`生成${prefix}单号失败:`, error);
    return `${baseOrderNo}001`;
  }
}

/**
 * 格式化日期为 YYYY-MM-DD 格式
 * @param {Date} date - 日期对象
 * @returns {string} 格式化后的日期字符串
 */
export function formatDateToYYYYMMDD(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
