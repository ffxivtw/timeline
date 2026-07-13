import { describe, it, expect } from 'vitest';
import type { Version } from '../types';
import { addDays, formatISODate, parseDate } from './dates';
import {
  sortedByGlobal,
  lagDays,
  recentLags,
  averageLag,
  currentVersion,
  serverIntervals,
  serverCadence,
  catchupRatio,
  referenceCatchupRatio,
  effectiveCatchupRatio,
  predictNext,
  predictSequence,
  dominantWeekday,
  snapToWeekday,
} from './prediction';

// 以「距 2024-01-01 的天數」構造日期，讓區間/比率乾淨可驗。
const B = '2024-01-01';
const d = (n: number) => formatISODate(addDays(parseDate(B), n));

// global 每 100 天一版；korea 為參考服（比率 0.8）；tw 為目標服。
const data: Version[] = [
  { version: '7.0', releases: { global: d(0), korea: d(50), tw: d(400) } },
  { version: '7.1', releases: { global: d(100), korea: d(130), tw: d(480) } },
  { version: '7.2', releases: { global: d(200), korea: d(210), tw: d(560) } },
  { version: '7.3', releases: { global: d(300) } },
];

describe('sortedByGlobal', () => {
  it('sorts by global release date, not by version string', () => {
    const withMixed: Version[] = [
      { version: '7.2', releases: { global: '2025-03-25' } },
      { version: '7.15', releases: { global: '2024-12-17' } },
      { version: '7.1', releases: { global: '2024-11-12' } },
    ];
    expect(sortedByGlobal(withMixed).map((v) => v.version)).toEqual(['7.1', '7.15', '7.2']);
  });
});

describe('lagDays', () => {
  it('returns server date minus global date in whole days', () => {
    expect(lagDays(data[0], 'korea')).toBe(50);
    expect(lagDays(data[0], 'tw')).toBe(400);
  });
  it('returns null when server has no release for that version', () => {
    expect(lagDays(data[3], 'korea')).toBeNull();
  });
});

describe('recentLags / averageLag', () => {
  it('averageLag averages the last n common versions', () => {
    expect(averageLag(data, 'korea', 3)).toBe(Math.round((50 + 30 + 10) / 3));
    expect(recentLags(data, 'korea', 2)).toEqual([30, 10]);
  });
  it('returns null when there are no common versions', () => {
    expect(averageLag([{ version: '1.0', releases: { global: d(0) } }], 'korea', 3)).toBeNull();
  });
});

describe('currentVersion', () => {
  it('returns the latest released version at or before now', () => {
    expect(currentVersion(data, 'tw', parseDate(d(500)))?.version).toBe('7.1');
  });
  it('ignores versions a late-joining server never had', () => {
    // tw 最早的版本是 7.0（d400）；now 在其之前 -> 尚無版本
    expect(currentVersion(data, 'tw', parseDate(d(390)))).toBeNull();
  });
});

describe('serverIntervals / serverCadence', () => {
  it('computes own consecutive release gaps', () => {
    expect(serverIntervals(data, 'tw')).toEqual([80, 80]); // 400→480→560
    expect(serverIntervals(data, 'korea')).toEqual([80, 80]); // 50→130→210
  });
  it('serverCadence averages recent gaps', () => {
    expect(serverCadence(data, 'tw', 3)).toBe(80);
  });
  it('excludes the given versions (e.g. opening batch) from cadence', () => {
    // 排除 7.0 -> 只剩 7.1(d480)→7.2(d560) 一段 = 80；此處造一組不同間隔驗證排除生效
    const v: Version[] = [
      { version: '7.0', releases: { global: d(0), tw: d(400) } }, // 開服批次
      { version: '7.05', releases: { global: d(50), tw: d(500) } }, // 7.0→7.05 = 100
      { version: '7.1', releases: { global: d(100), tw: d(540) } }, // 7.05→7.1 = 40
    ];
    expect(serverIntervals(v, 'tw')).toEqual([100, 40]);
    expect(serverIntervals(v, 'tw', ['7.0'])).toEqual([40]); // 排除 7.0 後只剩 7.05→7.1
    expect(serverCadence(v, 'tw', 3, ['7.0'])).toBe(40);
  });
  it('returns null when fewer than two releases', () => {
    expect(serverCadence([{ version: '7.0', releases: { global: d(0), tw: d(10) } }], 'tw', 3)).toBeNull();
  });
});

describe('catchupRatio / referenceCatchupRatio', () => {
  it('catchupRatio = server span / global span over common versions', () => {
    // korea 50→210 = 160 天；global 0→200 = 200 天 -> 0.8
    expect(catchupRatio(data, 'korea')).toBeCloseTo(0.8, 5);
  });
  it('referenceCatchupRatio averages other lagging servers, excluding target', () => {
    // 對 tw 而言，唯一其他落後服是 korea -> 0.8
    expect(referenceCatchupRatio(data, 'tw')).toBeCloseTo(0.8, 5);
  });
});

describe('effectiveCatchupRatio', () => {
  it('uses the server own recent catch-up ratio when it has enough history', () => {
    // tw 自身 3 個共同版本(7.0/7.1/7.2)：近 2 段 span = 400→560 = 160，global 0→200 = 200 -> 0.8
    // 應優先採用自身比率，而非參考服，也不再乘任何積極度常數。
    expect(effectiveCatchupRatio(data, 'tw', 2)).toBeCloseTo(0.8, 5);
  });

  it('falls back to referenceCatchupRatio when the server lacks its own history', () => {
    // 目標服只有一個共同版本 -> 無法算自身比率 -> 退回韓服參考(0.8)。
    const thin: Version[] = [
      { version: '7.0', releases: { global: d(0), korea: d(50), tw: d(400) } },
      { version: '7.1', releases: { global: d(100), korea: d(130) } },
      { version: '7.2', releases: { global: d(200), korea: d(210) } },
      { version: '7.3', releases: { global: d(300) } },
    ];
    expect(effectiveCatchupRatio(thin, 'tw', 2)).toBeCloseTo(0.8, 5);
  });

  it('returns null when neither own nor reference ratio is available', () => {
    const lone: Version[] = [
      { version: '7.0', releases: { global: d(0), tw: d(400) } },
      { version: '7.1', releases: { global: d(100) } },
    ];
    expect(effectiveCatchupRatio(lone, 'tw', 2)).toBeNull();
  });
});

describe('predictNext (hybrid)', () => {
  it('accelerates own cadence by the reference catch-up ratio', () => {
    const p = predictNext(data, 'tw', parseDate(d(600)));
    expect(p).not.toBeNull();
    expect(p!.currentVersion).toBe('7.2');
    expect(p!.nextVersion).toBe('7.3');
    expect(p!.method).toBe('blend');
    expect(p!.ownIntervalDays).toBe(80); // tw 自身節奏
    expect(p!.refRatio).toBeCloseTo(0.8, 5); // tw 自身近期追趕比率（自校準；此資料恰與 korea 相同）
    // 新模型：round(自身節奏 80 × 有效追趕比率 0.8)，不再乘積極度常數
    const nextInterval = Math.round(80 * 0.8);
    expect(p!.predictedIntervalDays).toBe(nextInterval);
    // 上一版 tw 7.2 = d(560)（此測試資料無固定星期，不對齊）
    expect(p!.predictedDate).toBe(d(560 + nextInterval));
  });

  it('self-calibrates from its own catch-up ratio even with no reference server', () => {
    // 移除所有其他落後服後，仍可用 tw「自身」近期追趕比率（0.8）自校準，
    // 不必退回未加速的原始節奏（method 仍為 blend）。
    const noRef = data.map((v) => ({
      ...v,
      releases: { global: v.releases.global, tw: v.releases.tw },
    }));
    const p = predictNext(noRef, 'tw', parseDate(d(600)));
    expect(p!.method).toBe('blend');
    expect(p!.refRatio).toBeCloseTo(0.8, 5); // tw 自身近期比率
    expect(p!.predictedDate).toBe(d(624)); // 560 + round(80 × 0.8)
  });

  it('uses raw own cadence when no catch-up ratio can be derived', () => {
    // 有自身節奏(80) 但算不出追趕比率（國際服跨距為 0）、也無參考服
    // → 退回未加速的原始節奏（method='own'）。
    const own: Version[] = [
      { version: '7.0', releases: { global: d(0), tw: d(400) } },
      { version: '7.05', releases: { global: d(0), tw: d(480) } }, // 同一 global 日 → globalSpan=0
      { version: '7.1', releases: { global: d(100) } },
    ];
    const p = predictNext(own, 'tw', parseDate(d(600)));
    expect(p!.method).toBe('own');
    expect(p!.refRatio).toBeNull();
    expect(p!.predictedDate).toBe(d(560)); // 480 + 80（未加速）
  });

  it('floors the prediction at the global release date of that version', () => {
    // 目標服近乎同步、但國際服下一版隔很久 -> 推估落在國際服日期之前，需抬升。
    const fl: Version[] = [
      { version: '7.1', releases: { global: d(100), korea: d(120), china: d(150) } },
      { version: '7.2', releases: { global: d(200), korea: d(220), china: d(250) } },
      { version: '7.3', releases: { global: d(900) } }, // 巨大間隔
    ];
    const p = predictNext(fl, 'china', parseDate(d(300)));
    expect(p!.nextVersion).toBe('7.3');
    expect(p!.predictedDate).toBe(d(900)); // 被國際服日期下限抬升
  });

  it('returns null when the server has released every known version', () => {
    const done: Version[] = [{ version: '7.0', releases: { global: d(0), tw: d(10) } }];
    expect(predictNext(done, 'tw', parseDate(d(100)))).toBeNull();
  });
});

describe('dominantWeekday / snapToWeekday', () => {
  it('finds the repeated release weekday, else null', () => {
    // 2026-03-10 / 04-21 / 06-23 皆為星期二（getUTCDay()===2）
    const tue: Version[] = [
      { version: '7.05', releases: { global: d(0), tw: '2026-03-10' } },
      { version: '7.1', releases: { global: d(1), tw: '2026-04-21' } },
      { version: '7.15', releases: { global: d(2), tw: '2026-06-23' } },
    ];
    expect(dominantWeekday(tue, 'tw')).toBe(2);
    // 全部不同星期 -> 視為無固定星期
    expect(dominantWeekday(data, 'tw')).toBeNull();
  });
  it('snaps a date to the nearest given weekday', () => {
    // 2026-08-04 是週二(2)；把週四(2026-08-06) 對齊到週二 -> 08-04
    expect(formatISODate(snapToWeekday(parseDate('2026-08-06'), 2))).toBe('2026-08-04');
  });
});

describe('predictSequence', () => {
  // 每段間隔 = round(國際服該段間隔 × 有效追趕比率 0.8)。
  const seg = (globalGap: number) => Math.round(globalGap * 0.8);

  it('chains each segment at the global segment length × catch-up ratio', () => {
    const seq = predictSequence(data, 'tw', parseDate(d(600)));
    expect(seq.map((r) => r.version)).toEqual(['7.3']); // 只有 7.3 尚未上線
    // 國際服 7.2→7.3 = 100 天；tw 7.2 = d(560)（此測試資料無固定星期，不對齊）
    expect(seq[0].intervalDays).toBe(seg(100));
    expect(seq[0].predictedDate).toBe(d(560 + seg(100)));
  });

  it('chains multiple future versions cumulatively per global segment', () => {
    const many: Version[] = [
      { version: '7.0', releases: { global: d(0), korea: d(50), tw: d(400) } },
      { version: '7.1', releases: { global: d(100), korea: d(130), tw: d(480) } },
      { version: '7.2', releases: { global: d(200), korea: d(210), tw: d(560) } },
      { version: '7.3', releases: { global: d(300) } },
      { version: '7.4', releases: { global: d(400) } },
    ];
    const seq = predictSequence(many, 'tw', parseDate(d(600)));
    expect(seq.map((r) => r.version)).toEqual(['7.3', '7.4']);
    // 兩段國際服皆 100 天，逐段累加
    expect(seq[0].predictedDate).toBe(d(560 + seg(100)));
    expect(seq[1].predictedDate).toBe(d(560 + 2 * seg(100)));
  });

  it('lengthens a segment proportionally to a longer global gap (e.g. expansion boundary)', () => {
    // 國際服 7.2→7.3 是普通段(100 天)，7.3→8.0 是資料片交界(300 天)。
    const boundary: Version[] = [
      { version: '7.1', releases: { global: d(100), korea: d(130), tw: d(480) } },
      { version: '7.2', releases: { global: d(200), korea: d(210), tw: d(560) } },
      { version: '7.3', releases: { global: d(300) } },
      { version: '8.0', releases: { global: d(600) } }, // 交界：國際服隔 300 天
    ];
    const seq = predictSequence(boundary, 'tw', parseDate(d(600)));
    expect(seq.map((r) => r.version)).toEqual(['7.3', '8.0']);
    expect(seq[0].intervalDays).toBe(seg(100)); // 普通段
    expect(seq[1].intervalDays).toBe(seg(300)); // 交界段
    // 交界段（國際服 3 倍長）必定明顯長於普通段
    expect(seq[1].intervalDays).toBeGreaterThan(seq[0].intervalDays);
  });

  it('surfaces already-known future dates as official entries, not predictions', () => {
    // now=d(650) 時 tw 目前版本為 7.15(d560)；7.2 已有官方日期(d700，未來)，
    // 應以 official=true、其實際日期呈現（而非被跳過），7.3 才是預估。
    const withOfficial: Version[] = [
      { version: '7.0', releases: { global: d(0), korea: d(50), tw: d(400) } },
      { version: '7.1', releases: { global: d(100), korea: d(130), tw: d(480) } },
      { version: '7.15', releases: { global: d(200), korea: d(210), tw: d(560) } },
      { version: '7.2', releases: { global: d(300), korea: d(320), tw: d(700) } }, // 官方未來日期
      { version: '7.3', releases: { global: d(400) } },
    ];
    const seq = predictSequence(withOfficial, 'tw', parseDate(d(650)));
    expect(seq.map((r) => r.version)).toEqual(['7.2', '7.3']);
    // 7.2：官方日期原樣呈現
    expect(seq[0].official).toBe(true);
    expect(seq[0].predictedDate).toBe(d(700));
    // 7.3：仍為預估（非官方），且以 7.2 的實際日期為推估基準
    expect(seq[1].official).toBeFalsy();
  });

  it('returns empty when the server is fully caught up', () => {
    const done: Version[] = [{ version: '7.0', releases: { global: d(0), tw: d(10) } }];
    expect(predictSequence(done, 'tw', parseDate(d(100)))).toEqual([]);
  });
});
