import type { ServerId, ServerMeta, Version } from '../types';

// ============================================================================
// ⚠️ 資料維護說明（請務必閱讀）
// ----------------------------------------------------------------------------
// 本檔為「手動維護」的版本資料，沒有自動抓取來源。
//
// 【已查證】
//  - global（國際服）：所有內容版本日期經 consolegameswiki 查證，為實際上線日，
//    作為所有預估的基準。國際服目前（2026-07 時）進度為 7.5。
//  - korea（韓服）：各版本日期取自韓服官網 patchnote（主要版本取列表日期，
//    小版本 7.15/7.25/7.35/7.45 取各更新筆記頁的日期），為實際上線日。
//    韓服已於 7.5 追平國際服（同日 2026-04-28）。
//  - china（中服）：各版本日期取自 huijiwiki「版本時間表」（透過 Wayback 快照），
//    為實際上線日。自 7.4 起與國際服完全同步（同日上線）。
//  - tw（繁中服）：正式開服 2025-12-10（搶先體驗 2025-11-27），開服即含 7.0；
//    7.05/7.1/7.15 為各版「改版維護日」（實際上線日，非更新筆記發佈日）。
//    目前版本為 7.15（2026-06-23 上線）。
//
// 【預估／未上線（2026-07 之後）】
//  - 7.55：國際服官方預告上線日 2026-07-28（開發中）。中/韓服自 7.4、7.5 起與國際服
//    同日同步，故 7.55 中/韓比照同日 2026-07-28（視為確定上線日，非虛點預估）。
//  - 8.0：下一資料片，目前僅知預計「2027 年 1 月」，確切日期未定；已對齊到國際服
//    慣例改版星期（週二），暫填 2027-01-19 為預估錨點。名稱／內容尚無官方中文確認，
//    暫不填 name/expansion（來源可靠度待確認）。
//
// 除上述預估／預告值外，其餘已填日期皆為查證後的實際上線日。
// 新增版本時，程式會自動依國際服日期排序，未上線的伺服器留空即可。
// ============================================================================

// 計算「自身改版節奏」時要排除的版本（該服首發批次，會扭曲節奏）。
// 繁中服開服時一次灌入至 7.0，7.0→7.05 的間隔並非常態節奏，故排除 7.0。
export const cadenceExcludedVersions: Partial<Record<ServerId, string[]>> = {
  tw: ['7.0'],
};

export const servers: ServerMeta[] = [
  { id: 'global', name: '國際服', short: '國際', color: '#0066cc', isBaseline: true },
  { id: 'china', name: '中服', short: '中國', color: '#d1495b', isBaseline: false },
  { id: 'korea', name: '韓服', short: '韓', color: '#2a9d8f', isBaseline: false },
  { id: 'tw', name: '繁中服', short: '繁中', color: '#e0912f', isBaseline: false },
];

export const versions: Version[] = [
  {
    version: '7.0',
    name: '金曦之遺',
    expansion: 'Dawntrail',
    releases: {
      global: '2024-07-02',
      china: '2024-09-27', // 已查證
      korea: '2024-12-03', // 已查證（韓服官網）
      tw: '2025-12-10', // 已查證（正式開服，開服即含 7.0）
    },
  },
  {
    version: '7.05',
    expansion: 'Dawntrail',
    releases: {
      global: '2024-07-30',
      china: '2024-11-12', // 已查證（huijiwiki）
      korea: '2025-01-14', // 已查證（韓服官網）
      tw: '2026-03-10', // 已查證（繁中改版維護日）
    },
  },
  {
    version: '7.1',
    name: '滿盈之愉',
    expansion: 'Dawntrail',
    releases: {
      global: '2024-11-12',
      china: '2025-02-18', // 已查證（huijiwiki）
      korea: '2025-03-18', // 已查證（韓服官網）
      tw: '2026-04-21', // 已查證（繁中改版維護日）
    },
  },
  {
    version: '7.15',
    expansion: 'Dawntrail',
    releases: {
      global: '2024-12-17',
      china: '2025-04-22', // 已查證（huijiwiki）
      korea: '2025-05-27', // 已查證（韓服官網）
      tw: '2026-06-23', // 已查證（繁中改版維護日）— 繁中服目前版本
    },
  },
  {
    version: '7.2',
    name: '祝祭之終',
    expansion: 'Dawntrail',
    releases: {
      global: '2025-03-25',
      china: '2025-06-24', // 已查證（huijiwiki）
      korea: '2025-07-15', // 已查證（韓服官網）
    },
  },
  {
    version: '7.25',
    expansion: 'Dawntrail',
    releases: {
      global: '2025-05-27',
      china: '2025-08-12', // 已查證（huijiwiki）
      korea: '2025-09-09', // 已查證（韓服官網）
    },
  },
  {
    version: '7.3',
    expansion: 'Dawntrail',
    releases: {
      global: '2025-08-05',
      china: '2025-09-16', // 已查證（huijiwiki）
      korea: '2025-10-28', // 已查證（韓服官網）
    },
  },
  {
    version: '7.35',
    expansion: 'Dawntrail',
    releases: {
      global: '2025-10-07',
      china: '2025-11-04', // 已查證（huijiwiki）
      korea: '2025-12-23', // 已查證（韓服官網）
    },
  },
  {
    version: '7.4',
    expansion: 'Dawntrail',
    releases: {
      global: '2025-12-16',
      china: '2025-12-16', // 已查證（huijiwiki）— 自 7.4 起與國際服同步
      korea: '2026-02-03', // 已查證（韓服官網）
    },
  },
  {
    version: '7.45',
    expansion: 'Dawntrail',
    releases: {
      global: '2026-03-03',
      china: '2026-03-03', // 已查證（huijiwiki）— 與國際服同步
      korea: '2026-03-17', // 已查證（韓服官網）
    },
  },
  {
    version: '7.5',
    expansion: 'Dawntrail',
    releases: {
      global: '2026-04-28',
      china: '2026-04-28', // 已同步（自 7.4 起）
      korea: '2026-04-28', // 已查證（韓服官網）— 已追平國際服
    },
  },
  {
    version: '7.55',
    expansion: 'Dawntrail',
    releases: {
      global: '2026-07-28', // 開發中，官方預告上線日
      china: '2026-07-28', // 與國際服同日（自 7.4 起同步）
      korea: '2026-07-28', // 與國際服同日（7.5 起已追平同步）
    },
  },
  {
    version: '8.0',
    releases: {
      // 預估：僅知預計 2027 年 1 月，日期未定；已對齊國際服慣例改版星期（週二）
      global: '2027-01-19',
    },
    tentative: { global: true }, // 國際服 8.0 為預估 → 時間軸以虛點呈現
  },
];
