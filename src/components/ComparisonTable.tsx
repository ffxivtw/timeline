import { useMemo } from 'react';
import type { ServerId, ServerMeta, Version } from '../types';
import { sortedByGlobal, lagDays } from '../lib/prediction';
import { parseDate, daysBetween, formatISODate } from '../lib/dates';
import './ComparisonTable.css';

interface Props {
  versions: Version[];
  servers: ServerMeta[];
}

// 版本 × 伺服器 的上線日期對照表（依國際服時間由新到舊）。
// 只列「已發生」的版本（至少一個伺服器的上線日 <= 現在）；未來/預估版本不出現在此表
// （預估請看時間軸與預估卡）。同理，個別伺服器尚未到來的（未來日期）儲存格以「—」呈現。
// 最上方為「現在」列，各服顯示距最新「已上線」版本到現在的天數（目前等待中的間隔）。
// 每個版本儲存格除了上線日期，另呈現兩種「經過時間」：
// - 「距上版 +N 天」：該服相對自己上一個已上線版本的間隔（各服改版節奏）。
// - 「落後 N 天」：非基準服相對國際服同版本的落後天數（跨服延遲，0 天不顯示）。
export function ComparisonTable({ versions, servers }: Props) {
  const ascending = sortedByGlobal(versions);
  const now = useMemo(() => new Date(), []);
  const nowMs = now.getTime();
  // 「已上線」＝有日期且不晚於現在（未來的預估/預告日期不算已發生）。
  const isReleased = (d?: string) => !!d && parseDate(d).getTime() <= nowMs;

  // 只保留至少一個伺服器已上線的版本，未來版本整列不顯示。
  const rows = [...ascending]
    .reverse()
    .filter((v) => servers.some((s) => isReleased(v.releases[s.id])));

  // 每服各自的「距上一版」天數與最新版本上線日：
  // 依國際服排序，以該服前一個「已上線」版本為基準（未來日期不列入基準）。
  const intervalByServer = new Map<ServerId, Map<string, number | null>>();
  const latestByServer = new Map<ServerId, string | undefined>();
  for (const s of servers) {
    const perVersion = new Map<string, number | null>();
    let prev: string | undefined;
    for (const v of ascending) {
      const d = v.releases[s.id];
      const released = isReleased(d);
      perVersion.set(v.version, released && prev ? daysBetween(parseDate(prev), parseDate(d!)) : null);
      if (released) prev = d;
    }
    intervalByServer.set(s.id, perVersion);
    latestByServer.set(s.id, prev);
  }

  return (
    <div className="table-wrap">
      <table className="cmp-table">
        <thead>
          <tr>
            <th>版本</th>
            {servers.map((s) => (
              <th key={s.id} style={{ color: s.color }}>
                {s.name}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          <tr className="row-now">
            <th scope="row">
              <span className="ver-num">現在</span>
              <span className="ver-name">{formatISODate(now)}</span>
            </th>
            {servers.map((s) => {
              const latest = latestByServer.get(s.id);
              const since = latest ? daysBetween(parseDate(latest), now) : null;
              return (
                <td key={s.id} className={since === null ? 'cell-empty' : ''}>
                  {since === null ? '—' : <span className="cell-sub cell-interval">距上版 +{since} 天</span>}
                </td>
              );
            })}
          </tr>
          {rows.map((v) => (
            <tr key={v.version}>
              <th scope="row">
                <span className="ver-num">{v.version}</span>
                {v.name && <span className="ver-name">{v.name}</span>}
              </th>
              {servers.map((s) => {
                const date = v.releases[s.id];
                const released = isReleased(date);
                const interval = intervalByServer.get(s.id)?.get(v.version) ?? null;
                // 該服尚未上線（無日期或日期在未來）→ 不顯示落後天數。
                const lag = s.isBaseline || !released ? null : lagDays(v, s.id);
                return (
                  <td key={s.id} className={released ? '' : 'cell-empty'}>
                    {released ? date : '—'}
                    {interval !== null && (
                      <span className="cell-sub cell-interval">距上版 +{interval} 天</span>
                    )}
                    {lag !== null && lag !== 0 && (
                      <span className="cell-sub cell-lag">落後 {lag} 天</span>
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
