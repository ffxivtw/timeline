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
// 最上方為「現在」列，各服顯示距最新版本到現在的天數（目前等待中的間隔）。
// 每個版本儲存格除了上線日期，另呈現兩種「經過時間」：
// - 「距上版 +N 天」：該服相對自己上一個已上線版本的間隔（各服改版節奏）。
// - 「落後 N 天」：非基準服相對國際服同版本的落後天數（跨服延遲，0 天不顯示）。
export function ComparisonTable({ versions, servers }: Props) {
  const ascending = sortedByGlobal(versions);
  const rows = [...ascending].reverse();
  const now = useMemo(() => new Date(), []);

  // 每服各自的「距上一版」天數與最新版本上線日：
  // 依國際服排序，以該服前一個有日期的版本為基準。
  const intervalByServer = new Map<ServerId, Map<string, number | null>>();
  const latestByServer = new Map<ServerId, string | undefined>();
  for (const s of servers) {
    const perVersion = new Map<string, number | null>();
    let prev: string | undefined;
    for (const v of ascending) {
      const d = v.releases[s.id];
      perVersion.set(v.version, d && prev ? daysBetween(parseDate(prev), parseDate(d)) : null);
      if (d) prev = d;
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
                const interval = intervalByServer.get(s.id)?.get(v.version) ?? null;
                const lag = s.isBaseline ? null : lagDays(v, s.id);
                return (
                  <td key={s.id} className={date ? '' : 'cell-empty'}>
                    {date ?? '—'}
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
