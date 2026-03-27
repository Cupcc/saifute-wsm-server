import request from "@/utils/request";
import {
  buildDataResponse,
  buildPageQuery,
  buildRowsResponse,
  fetchMaterialInventoryMap,
  mapMaterial,
  pickKeyword,
  unsupportedBaseAction,
} from "./compat";

// 查询物料列表
export function listMaterial(query = {}) {
  const { limit, offset } = buildPageQuery(query);
  return request({
    url: "/api/master-data/materials",
    method: "get",
    params: {
      keyword: pickKeyword(query, ["materialCode", "materialName"]),
      limit,
      offset,
    },
  }).then((response) => buildRowsResponse(response.data, mapMaterial));
}

// 查询物料列表（支持按编码或名称模糊搜索）
export async function listMaterialByCodeOrName(query = {}) {
  const { limit, offset } = buildPageQuery(query);
  const [materialResponse, inventoryMap] = await Promise.all([
    request({
      url: "/api/master-data/materials",
      method: "get",
      params: {
        keyword: pickKeyword(query, ["materialCode", "materialName"]),
        limit,
        offset,
      },
    }),
    fetchMaterialInventoryMap(query, limit).catch(() => new Map()),
  ]);

  return buildRowsResponse(materialResponse.data, (item) =>
    mapMaterial(item, { currentQty: inventoryMap.get(item.id) }),
  );
}

// 查询物料详细
export async function getMaterial(materialId) {
  const response = await request({
    url: `/api/master-data/materials/${materialId}`,
    method: "get",
  });
  return buildDataResponse(response.data, mapMaterial);
}

// 新增物料
export function addMaterial(data) {
  return request({
    url: "/api/master-data/materials",
    method: "post",
    data: {
      materialCode: data.materialCode,
      materialName: data.materialName,
      specModel: data.specification,
      categoryId: data.category,
      unitCode: data.unit,
      warningMinQty: data.stockMin,
      warningMaxQty: data.stockMax,
    },
  });
}

// 修改物料
export function updateMaterial(data) {
  return request({
    url: `/api/master-data/materials/${data.materialId}`,
    method: "patch",
    data: {
      materialName: data.materialName,
      specModel: data.specification,
      categoryId: data.category,
      unitCode: data.unit,
      warningMinQty: data.stockMin,
      warningMaxQty: data.stockMax,
    },
  });
}

// 删除物料
export function delMaterial() {
  return unsupportedBaseAction("当前 NestJS 后端未提供物料作废接口");
}
