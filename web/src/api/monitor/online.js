import request from "@/utils/request";
import { buildPageQuery, mapOnlineSession } from "./compat";

// 查询在线用户列表
export function list(query = {}) {
  const { pageNum, pageSize } = buildPageQuery(query);
  return request({
    url: "/api/sessions/online",
    method: "get",
  }).then((response) => {
    const rows = (response.data?.items || []).map(mapOnlineSession);
    const filteredRows = rows.filter((item) => {
      const matchIp =
        !query.ipaddr || item.ipaddr?.includes(String(query.ipaddr));
      const matchUser =
        !query.userName || item.userName?.includes(String(query.userName));
      return matchIp && matchUser;
    });

    return {
      rows: filteredRows.slice((pageNum - 1) * pageSize, pageNum * pageSize),
      total: filteredRows.length,
    };
  });
}

// 强退用户
export function forceLogout(tokenId) {
  return request({
    url: `/api/sessions/${tokenId}`,
    method: "delete",
  });
}
