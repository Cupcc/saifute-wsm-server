import request from "@/utils/request";

// 获取路由
export const getRouters = () => {
  return request({
    url: "/api/auth/routes",
    method: "get",
  });
};
