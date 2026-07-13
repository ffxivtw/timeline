import { Fragment, useMemo } from 'react';
import type { ServerMeta, Version } from '../types';
import { predictSequence } from '../lib/prediction';
import { parseDate, daysBetween } from '../lib/dates';
import { cadenceExcludedVersions } from '../data/versions';
import './PredictionCard.css';

interface Props {
  versions: Version[];
  servers: ServerMeta[];
}

// 固定以繁中服為目標，顯示其後續各版本的預估上線日。
export function PredictionCard({ versions, servers }: Props) {
  // 目標固定為繁中服（若不存在則取第一個非基準服）。
  const target =
    servers.find((s) => s.id === 'tw')?.id ?? servers.find((s) => !s.isBaseline)?.id ?? servers[0].id;
  const meta = servers.find((s) => s.id === target)!;

  const now = useMemo(() => new Date(), []);
  const sequence = predictSequence(versions, target, now, 3, cadenceExcludedVersions[target] ?? []);

  if (sequence.length === 0) {
    return (
      <p className="pred-empty">
        {meta.name} 目前資料中已無可預估的版本（已與國際服同步）。
      </p>
    );
  }

  return (
    <ol className="pred-list">
      {sequence.map((r, i) => {
        const daysAway = daysBetween(now, parseDate(r.predictedDate));
        return (
          <Fragment key={r.version}>
            <li className={`pred-row${r.official ? ' pred-row-official' : ''}`}>
              <span className="pred-ver" style={{ color: meta.color }}>
                {r.version}
              </span>
              <span className="pred-date">
                {r.predictedDate}
                {r.official && <span className="pred-badge">官方公告</span>}
              </span>
              <span className="pred-countdown">
                {daysAway > 0
                  ? `約還有 ${daysAway} 天`
                  : daysAway === 0
                    ? (r.official ? '就在今天' : '預估就在今天')
                    : r.official
                      ? `已上線 ${-daysAway} 天`
                      : `已超過預估 ${-daysAway} 天`}
              </span>
            </li>
            {/* 版本之間的預估間距（下一版距本版的天數） */}
            {i < sequence.length - 1 && (
              <li className="pred-gap" aria-hidden="true">
                <span className="pred-gap-days">↓ {sequence[i + 1].intervalDays} 天</span>
              </li>
            )}
          </Fragment>
        );
      })}
    </ol>
  );
}
