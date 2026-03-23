import request from "@/utils/request";

// 审核单据
export function auditDocument(data) {
  return request({
    url: "/audit/document",
    method: "post",
    data: data,
  });
}
