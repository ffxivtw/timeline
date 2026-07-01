// FFXIV 各區域伺服器識別碼。global（國際服）為版本進度基準。
export type ServerId = 'global' | 'china' | 'korea' | 'tw';

// 伺服器中繼資料，用於 UI 顯示。
export interface ServerMeta {
  id: ServerId;
  name: string; // 顯示名稱（繁中）
  short: string; // 時間軸軌道短標籤
  color: string; // 代表色（CSS 色碼）
  isBaseline: boolean; // 是否為基準服（國際服）
}

// 單一版本在各服的上線資訊。
// releases 以 ISO 日期字串（YYYY-MM-DD）記錄，未上線的服則缺省。
export interface Version {
  version: string; // 版本號，如 "7.15"
  name?: string; // 版本名稱
  expansion?: string; // 所屬資料片，如 "Dawntrail"
  releases: Partial<Record<ServerId, string>>;
  // 標記某服的 releases 日期為「預估值」（非官方確定）。
  // 有此標記者，時間軸以空心虛點呈現（與實心事實點區隔），但日期仍作為其他服預估的下限。
  tentative?: Partial<Record<ServerId, boolean>>;
}
