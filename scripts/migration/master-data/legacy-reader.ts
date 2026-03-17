import { MATERIAL_CATEGORY_DICT_TYPE } from "../config";
import type { MigrationConnectionLike } from "../db";
import type {
  LegacyCustomerRow,
  LegacyMasterDataSnapshot,
  LegacyMaterialCategoryRow,
  LegacyMaterialRow,
  LegacyPersonnelRow,
  LegacySupplierRow,
  LegacyWorkshopRow,
} from "./types";

export async function readLegacyMasterDataSnapshot(
  connection: MigrationConnectionLike,
): Promise<LegacyMasterDataSnapshot> {
  const [
    materialCategories,
    workshops,
    suppliers,
    personnel,
    customers,
    materials,
  ] = await Promise.all([
    connection.query<LegacyMaterialCategoryRow[]>(
      `
        SELECT
          dict_code AS dictCode,
          dict_sort AS dictSort,
          dict_label AS dictLabel,
          dict_value AS dictValue,
          dict_type AS dictType,
          status,
          css_class AS cssClass,
          list_class AS listClass,
          is_default AS isDefault,
          remark,
          create_by AS createBy,
          create_time AS createTime,
          update_by AS updateBy,
          update_time AS updateTime
        FROM sys_dict_data
        WHERE dict_type = ?
        ORDER BY dict_sort ASC, dict_code ASC
      `,
      [MATERIAL_CATEGORY_DICT_TYPE],
    ),
    connection.query<LegacyWorkshopRow[]>(
      `
        SELECT
          workshop_id AS workshopId,
          workshop_name AS workshopName,
          contact_person AS contactPerson,
          charge_by AS chargeBy,
          del_flag AS delFlag,
          void_description AS voidDescription,
          create_by AS createBy,
          create_time AS createTime,
          update_by AS updateBy,
          update_time AS updateTime
        FROM saifute_workshop
        ORDER BY workshop_id ASC
      `,
    ),
    connection.query<LegacySupplierRow[]>(
      `
        SELECT
          supplier_id AS supplierId,
          supplier_code AS supplierCode,
          supplier_name AS supplierName,
          supplier_short_name AS supplierShortName,
          contact_person AS contactPerson,
          contact_phone AS contactPhone,
          address,
          del_flag AS delFlag,
          void_description AS voidDescription,
          create_by AS createBy,
          create_time AS createTime,
          update_by AS updateBy,
          update_time AS updateTime
        FROM saifute_supplier
        ORDER BY supplier_id ASC
      `,
    ),
    connection.query<LegacyPersonnelRow[]>(
      `
        SELECT
          personnel_id AS personnelId,
          type,
          code,
          name,
          name_pinyin AS namePinyin,
          contact_phone AS contactPhone,
          del_flag AS delFlag,
          void_description AS voidDescription,
          create_by AS createBy,
          create_time AS createTime,
          update_by AS updateBy,
          update_time AS updateTime
        FROM saifute_personnel
        ORDER BY personnel_id ASC
      `,
    ),
    connection.query<LegacyCustomerRow[]>(
      `
        SELECT
          customer_id AS customerId,
          customer_code AS customerCode,
          customer_name AS customerName,
          customer_short_name AS customerShortName,
          customer_type AS customerType,
          parent_id AS parentId,
          contact_person AS contactPerson,
          contact_phone AS contactPhone,
          address,
          remark,
          del_flag AS delFlag,
          void_description AS voidDescription,
          create_by AS createBy,
          create_time AS createTime,
          update_by AS updateBy,
          update_time AS updateTime
        FROM saifute_customer
        ORDER BY customer_id ASC
      `,
    ),
    connection.query<LegacyMaterialRow[]>(
      `
        SELECT
          material_id AS materialId,
          material_code AS materialCode,
          material_name AS materialName,
          specification,
          category,
          is_attachment AS isAttachment,
          unit,
          is_hidden AS isHidden,
          stock_min AS stockMin,
          del_flag AS delFlag,
          void_description AS voidDescription,
          create_by AS createBy,
          create_time AS createTime,
          update_by AS updateBy,
          update_time AS updateTime
        FROM saifute_material
        ORDER BY material_id ASC
      `,
    ),
  ]);

  return {
    materialCategories,
    workshops,
    suppliers,
    personnel,
    customers,
    materials,
  };
}
