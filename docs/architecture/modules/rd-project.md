# 研发项目模块设计

## 模块目标与职责

`rd-project` 承接内部研发项目主档、BOM、缺料补货视图，以及研发项目领料 / 退料 / 报废动作。

## 需求真源

- 需求真源：`docs/requirements/domain/rd-project-management.md`
- 协同主题：`docs/requirements/domain/rd-subwarehouse.md`
- 对外销售项目真源：`docs/requirements/domain/sales-project-management.md`

## 当前代码合同

- 后端模块：`src/modules/rd-project`
- 前端入口：`/rd/projects`
- API 前缀：`/api/rd-projects`
- 权限前缀：`rd:project:*`

## 逻辑模型与物理映射

- 逻辑 Prisma 模型：`RdProject`、`RdProjectBomLine`、`RdProjectMaterialAction`、`RdProjectMaterialActionLine`
- 当前物理表：`rd_project`、`rd_project_bom_line`、`rd_project_material_action`、`rd_project_material_action_line`
- 库存动作类型：`RD_PROJECT_OUT`
- 统一目标维度：`project_target.targetType = RD_PROJECT`

## 关键约束

- 固定库存范围：`RD_SUB`
- 真实库存动作统一通过 `inventory-core` 记账
- 与 `sales-project` 分域，不共享外部销售项目语义
