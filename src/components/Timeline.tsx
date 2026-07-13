import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { ServerMeta, Version } from '../types';
import { parseDate, daysBetween, addDays, formatISODate } from '../lib/dates';
import { predictSequence, sortedByGlobal } from '../lib/prediction';
import { cadenceExcludedVersions } from '../data/versions';
import './Timeline.css';

interface Props {
  versions: Version[];
  servers: ServerMeta[];
}

const PX_PER_DAY = 1.5;
const PAD_DAYS = 25;

// 橫向多軌時間軸：每服一條連續的軸線，版本點座落在線上依上線日期排列；
// 一條「現在」垂直線依瀏覽器本地時間定位，各服預估的下個版本以虛線延伸至空心點。
export function Timeline({ versions, servers }: Props) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);

  // 首次渲染後，自動捲動使「現在」線置中可見。
  const wrapRef = useRef<HTMLDivElement>(null);
  const nowRef = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const wrap = wrapRef.current;
    const nowEl = nowRef.current;
    if (!wrap || !nowEl) return;
    wrap.scrollLeft = Math.max(0, nowEl.offsetLeft - wrap.clientWidth / 2);
    // 只在掛載時執行一次（避免每分鐘更新時強制捲動打斷使用者瀏覽）。
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const sorted = sortedByGlobal(versions);
  const sequences = servers.map((s) =>
    predictSequence(versions, s.id, now, 3, cadenceExcludedVersions[s.id] ?? []),
  );

  // 座標範圍：所有版本點 + 預估點 + 現在。
  const times: number[] = [];
  for (const v of sorted) {
    for (const s of servers) {
      const d = v.releases[s.id];
      if (d) times.push(parseDate(d).getTime());
    }
  }
  for (const seq of sequences) for (const r of seq) times.push(parseDate(r.predictedDate).getTime());
  times.push(now.getTime());

  const start = addDays(new Date(Math.min(...times)), -PAD_DAYS);
  const end = addDays(new Date(Math.max(...times)), PAD_DAYS);
  const totalDays = daysBetween(start, end);
  const width = Math.max(720, Math.round(totalDays * PX_PER_DAY));

  const x = (d: Date) => (daysBetween(start, d) / totalDays) * 100; // 百分比
  const ticks = quarterTicks(start, end);

  return (
    <div className="timeline">
      <div className="tl-labels">
        <div className="tl-axis-spacer" />
        {servers.map((s) => (
          <div key={s.id} className="tl-label-cell">
            <span className="tl-dot-legend" style={{ background: s.color }} />
            {s.name}
          </div>
        ))}
      </div>

      <div className="tl-plot-wrap" ref={wrapRef}>
        <div className="tl-plot" style={{ width }}>
          <div className="tl-axis">
            <div className="tl-axis-line" />
            {ticks.map((t) => (
              <div key={t.getTime()} className="tl-tick" style={{ left: `${x(t)}%` }}>
                <span className="tl-tick-mark" />
                <span className="tl-tick-label">
                  {t.getUTCFullYear()}/{String(t.getUTCMonth() + 1).padStart(2, '0')}
                </span>
              </div>
            ))}
          </div>

          {servers.map((s, i) => {
            // 確定上線日（實心點）與預估日（tentative，空心點）分開處理。
            const confirmed = sorted
              .filter((v) => v.releases[s.id] && !v.tentative?.[s.id])
              .map((v) => ({ v, x: x(parseDate(v.releases[s.id]!)) }));
            const tentative = sorted
              .filter((v) => v.releases[s.id] && v.tentative?.[s.id])
              .map((v) => ({ v, x: x(parseDate(v.releases[s.id]!)) }));
            // 官方公告日期已在 confirmed 以實心點呈現，這裡只畫「演算法預估」的空心點。
            const seq = sequences[i]
              .filter((r) => !r.official)
              .map((r) => ({ r, x: x(parseDate(r.predictedDate)) }));
            const firstX = confirmed.length ? confirmed[0].x : 0;
            const lastX = confirmed.length ? confirmed[confirmed.length - 1].x : 0;
            // 虛線需延伸涵蓋所有「預估點」：tentative 日期 + 引擎推估點。
            const predXs = [...tentative.map((t) => t.x), ...seq.map((p) => p.x)];
            const lastPredX = predXs.length ? Math.max(...predXs) : null;

            return (
              <div key={s.id} className="tl-track">
                {ticks.map((t) => (
                  <div key={t.getTime()} className="tl-gridline" style={{ left: `${x(t)}%` }} />
                ))}

                {/* 已上線區間的實線軸 */}
                {confirmed.length > 0 && (
                  <div
                    className="tl-line"
                    style={{ left: `${firstX}%`, width: `${lastX - firstX}%`, background: s.color }}
                  />
                )}
                {/* 延伸到所有預估版本的虛線 */}
                {lastPredX !== null && (
                  <div
                    className="tl-line tl-line-predicted"
                    style={{
                      left: `${lastX}%`,
                      width: `${Math.max(0, lastPredX - lastX)}%`,
                      borderTopColor: s.color,
                    }}
                  />
                )}

                {confirmed.map((p) => (
                  <div
                    key={p.v.version}
                    className="tl-point"
                    style={{ left: `${p.x}%`, background: s.color }}
                    title={`${s.name} ${p.v.version}｜${p.v.releases[s.id]}`}
                  >
                    <span className="tl-point-label">{p.v.version}</span>
                  </div>
                ))}

                {/* 預估日（tentative）：空心虛點，與引擎推估點同樣式 */}
                {tentative.map((p) => (
                  <div
                    key={p.v.version}
                    className="tl-point tl-point-predicted"
                    style={{ left: `${p.x}%`, borderColor: s.color }}
                    title={`預估 ${s.name} ${p.v.version}｜約 ${p.v.releases[s.id]}`}
                  >
                    <span className="tl-point-label tl-predicted-label">{p.v.version}?</span>
                  </div>
                ))}

                {seq.map((p) => (
                  <div
                    key={p.r.version}
                    className="tl-point tl-point-predicted"
                    style={{ left: `${p.x}%`, borderColor: s.color }}
                    title={`預估 ${s.name} ${p.r.version}｜約 ${p.r.predictedDate}`}
                  >
                    <span className="tl-point-label tl-predicted-label">{p.r.version}?</span>
                  </div>
                ))}
              </div>
            );
          })}

          <div className="tl-now" ref={nowRef} style={{ left: `${x(now)}%` }}>
            <span className="tl-now-label">現在 {formatISODate(now)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// 產生涵蓋 [start, end] 的每季（3 個月）刻度。
function quarterTicks(start: Date, end: Date): Date[] {
  const ticks: Date[] = [];
  let year = start.getUTCFullYear();
  let month = Math.floor(start.getUTCMonth() / 3) * 3;
  let t = new Date(Date.UTC(year, month, 1));
  while (t.getTime() <= end.getTime()) {
    if (t.getTime() >= start.getTime()) ticks.push(t);
    month += 3;
    if (month > 11) {
      month -= 12;
      year += 1;
    }
    t = new Date(Date.UTC(year, month, 1));
  }
  return ticks;
}
