# 月度自动报表需求口径确认

## Metadata

- ID: `req-20260323-0910-monthly-reporting`
- Status: `confirmed`
- Lifecycle disposition: `retained-completed`
- Owner: `user`
- Topic requirement: `docs/requirements/topics/monthly-reporting.md`
- Related tasks:
  - None

## 用户需求

- [x] 系统需要自动生成月度报表，至少提供公司整体月度汇总。
- [x] 需要提供按生产车间划分的月度汇总与明细报表。
- [x] 需要提供按销售域划分的月度汇总与明细报表。
- [x] 需要提供按研发项目划分的月度汇总与明细报表。
- [x] 报表应服务管理核对与经营分析，口径需清晰、可追溯、便于导出。

## 当前进展

- 阶段进度: 月报长期主题与核心口径已确认，并已归档本次口径确认切片。
- 当前状态: 长期约束、能力清单与阶段路线图已收口到 `docs/requirements/topics/monthly-reporting.md`；本文档只保留口径确认记录，后续真正进入设计或实现时应另开新的月报切片 requirement / task。
- 已确认口径: 生成方式采用“固定正式月报 + 人工重算 + 日期范围报表”；统计范围覆盖整体、车间、销售域、研发项目；交付形式为系统查看 + `Excel` 导出；补录后重算必须可追溯。
- 阻塞项: None
- 下一步: 归档；等待后续新切片。

## 待确认

- None
