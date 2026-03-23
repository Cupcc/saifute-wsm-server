import axios from "axios";
import {
  ElLoading,
  ElMessage,
  ElMessageBox,
  ElNotification,
} from "element-plus";
import { saveAs } from "file-saver";
import cache from "@/plugins/cache";
import useUserStore from "@/store/modules/user";
import { getToken } from "@/utils/auth";
import errorCode from "@/utils/errorCode";
import { blobValidate, tansParams } from "@/utils/ruoyi";

let downloadLoadingInstance;
// 是否显示重新登录
export const isRelogin = { show: false };

axios.defaults.headers["Content-Type"] = "application/json;charset=utf-8";
// 创建axios实例
const service = axios.create({
  // axios中请求配置有baseURL选项，表示请求URL公共部分
  baseURL: import.meta.env.VITE_APP_BASE_API,
  // 超时
  timeout: 10000,
});

// 按接口的请求锁：同一 method+url 未返回前不允许重复提交
const pendingLockMap = new Map();
// 接口响应完成后冷却时间(ms)，此时间内不允许再次触发该接口
const RESPONSE_COOLDOWN_MS = 3000;
// 记录每个接口上次响应完成的时间
const responseCompletedTimeMap = new Map();

// request拦截器
service.interceptors.request.use(
  (config) => {
    // 是否需要设置 token
    const isToken = (config.headers || {}).isToken === false;
    // 是否需要防止数据重复提交
    const isRepeatSubmit = (config.headers || {}).repeatSubmit === false;
    if (getToken() && !isToken) {
      config.headers["Authorization"] = "Bearer " + getToken(); // 让每个请求携带自定义token 请根据实际情况自行修改
    }
    // get请求映射params参数
    if (config.method === "get" && config.params) {
      let url = config.url + "?" + tansParams(config.params);
      url = url.slice(0, -1);
      config.params = {};
      config.url = url;
    }
    if (
      !isRepeatSubmit &&
      (config.method === "post" || config.method === "put")
    ) {
      const lockKey = `${config.method}:${config.url}`;
      if (pendingLockMap.get(lockKey)) {
        const message = "数据正在处理，请勿重复提交";
        console.warn(`[${config.url}]: ` + message);
        ElMessage.warning(message);
        return Promise.reject(new Error(message));
      }
      // 响应完成后 3s 内不允许再次触发该接口
      const completedAt = responseCompletedTimeMap.get(lockKey);
      if (completedAt && Date.now() - completedAt < RESPONSE_COOLDOWN_MS) {
        const message = "处理完成后3秒内无法重复提交";
        console.warn(`[${config.url}]: ` + message);
        ElMessage.warning(message);
        return Promise.reject(new Error(message));
      }
      pendingLockMap.set(lockKey, true);
      config.__lockKey__ = lockKey;

      const requestObj = {
        url: config.url,
        data:
          typeof config.data === "object"
            ? JSON.stringify(config.data)
            : config.data,
        time: new Date().getTime(),
      };
      const requestSize = Object.keys(JSON.stringify(requestObj)).length; // 请求数据大小
      const limitSize = 5 * 1024 * 1024; // 限制存放数据5M
      if (requestSize >= limitSize) {
        console.warn(
          `[${config.url}]: ` +
            "请求数据大小超出允许的5M限制，无法进行防重复提交验证。",
        );
        pendingLockMap.delete(lockKey);
        return config;
      }
      const sessionObj = cache.session.getJSON("sessionObj");
      if (
        sessionObj === undefined ||
        sessionObj === null ||
        sessionObj === ""
      ) {
        cache.session.setJSON("sessionObj", requestObj);
      } else {
        const s_url = sessionObj.url; // 请求地址
        const s_data = sessionObj.data; // 请求数据
        const s_time = sessionObj.time; // 请求时间
        const interval = 3000; // 间隔时间(ms)，3秒内相同数据视为重复提交
        if (
          s_data === requestObj.data &&
          requestObj.time - s_time < interval &&
          s_url === requestObj.url
        ) {
          const message = "3秒内请勿重复提交相同数据";
          console.warn(`[${s_url}]: ` + message);
          ElMessage.warning(message);
          pendingLockMap.delete(lockKey);
          return Promise.reject(new Error(message));
        } else {
          cache.session.setJSON("sessionObj", requestObj);
        }
      }
    }
    return config;
  },
  (error) => {
    console.log(error);
    Promise.reject(error);
  },
);

// 响应拦截器
service.interceptors.response.use(
  (res) => {
    // 请求结束，释放该接口的提交锁，并记录响应完成时间（用于 3s 冷却）
    const lockKey = res.config?.__lockKey__;
    if (lockKey) {
      pendingLockMap.delete(lockKey);
      responseCompletedTimeMap.set(lockKey, Date.now());
    }

    // 未设置状态码则默认成功状态
    const code = res.data.code || 200;
    // 获取错误信息
    const msg = errorCode[code] || res.data.msg || errorCode["default"];
    // 二进制数据则直接返回
    if (
      res.request.responseType === "blob" ||
      res.request.responseType === "arraybuffer"
    ) {
      return res.data;
    }
    if (code === 401) {
      if (!isRelogin.show) {
        isRelogin.show = true;
        ElMessageBox.confirm(
          "登录状态已过期，您可以继续留在该页面，或者重新登录",
          "系统提示",
          {
            confirmButtonText: "重新登录",
            cancelButtonText: "取消",
            type: "warning",
          },
        )
          .then(() => {
            isRelogin.show = false;
            useUserStore()
              .logOut()
              .then(() => {
                location.href = "/index";
              });
          })
          .catch(() => {
            isRelogin.show = false;
          });
      }
      return Promise.reject("无效的会话，或者会话已过期，请重新登录。");
    } else if (code === 500) {
      ElMessage({ message: msg, type: "error" });
      return Promise.reject(new Error(msg));
    } else if (code === 601) {
      ElMessage({ message: msg, type: "warning" });
      return Promise.reject(new Error(msg));
    } else if (code !== 200) {
      ElNotification.error({ title: msg });
      return Promise.reject("error");
    } else {
      return Promise.resolve(res.data);
    }
  },
  (error) => {
    // 请求结束（含失败），释放该接口的提交锁，并记录响应完成时间（用于 3s 冷却）
    const lockKey = error.config?.__lockKey__;
    if (lockKey) {
      pendingLockMap.delete(lockKey);
      responseCompletedTimeMap.set(lockKey, Date.now());
    }

    console.log("err" + error);
    let { message } = error;
    if (message == "Network Error") {
      message = "后端接口连接异常";
    } else if (message.includes("timeout")) {
      message = "系统接口请求超时";
    } else if (message.includes("Request failed with status code")) {
      message = "系统接口" + message.substr(message.length - 3) + "异常";
    }
    ElMessage({ message: message, type: "error", duration: 5 * 1000 });
    return Promise.reject(error);
  },
);

// 通用下载方法
export function download(url, params, filename, config) {
  downloadLoadingInstance = ElLoading.service({
    text: "正在下载数据，请稍候",
    background: "rgba(0, 0, 0, 0.7)",
  });
  return service
    .post(url, params, {
      transformRequest: [
        (params) => {
          return tansParams(params);
        },
      ],
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      responseType: "blob",
      ...config,
    })
    .then(async (data) => {
      const isBlob = blobValidate(data);
      if (isBlob) {
        const blob = new Blob([data]);
        saveAs(blob, filename);
      } else {
        const resText = await data.text();
        const rspObj = JSON.parse(resText);
        const errMsg =
          errorCode[rspObj.code] || rspObj.msg || errorCode["default"];
        ElMessage.error(errMsg);
      }
      downloadLoadingInstance.close();
    })
    .catch((r) => {
      console.error(r);
      ElMessage.error("下载文件出现错误，请联系管理员！");
      downloadLoadingInstance.close();
    });
}

export default service;
