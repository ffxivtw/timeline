import type { ServerId, Version } from '../types';
import { addDays, daysBetween, formatISODate, parseDate } from './dates';

// 依國際服（基準）上線日期由舊到新排序。國際服無日期者排到最後。
export function sortedByGlobal(versions: Version[]): Version[] {
  return [...versions].sort((a, b) => {
    const ga = a.releases.global;
    const gb = b.releases.global;
    if (ga && gb) return parseDate(ga).getTime() - parseDate(gb).getTime();
    if (ga) return -1;
    if (gb) return 1;
    return 0;
  });
}

// 某版本在指定服相對國際服的延遲天數；缺任一日期則回 null。
export function lagDays(version: Version, server: ServerId): number | null {
  const g = version.releases.global;
  const s = version.releases[server];
  if (!g || !s) return null;
  return daysBetween(parseDate(g), parseDate(s));
}

// 取最近 n 個「兩服都有日期」版本的延遲值（依國際服時間排序）。
export function recentLags(versions: Version[], server: ServerId, n: number): number[] {
  const lags: number[] = [];
  for (const v of sortedByGlobal(versions)) {
    const lag = lagDays(v, server);
    if (lag !== null) lags.push(lag);
  }
  return lags.slice(-n);
}

// 最近 n 版延遲的平均（四捨五入）；無共同版本回 null。
export function averageLag(versions: Version[], server: ServerId, n: number): number | null {
  const lags = recentLags(versions, server, n);
  if (lags.length === 0) return null;
  return Math.round(lags.reduce((a, b) => a + b, 0) / lags.length);
}

// 指定服在 now（含）之前已上線的最新版本。
export function currentVersion(versions: Version[], server: ServerId, now: Date): Version | null {
  let current: Version | null = null;
  for (const v of sortedByGlobal(versions)) {
    const s = v.releases[server];
    if (s && parseDate(s).getTime() <= now.getTime()) current = v;
  }
  return current;
}

// 指定服「自身」相鄰版本的改版間隔（天），依國際服時間順序。
// excludeVersions：計算節奏時要排除的版本（如該服首發批次版本）。
export function serverIntervals(
  versions: Version[],
  server: ServerId,
  excludeVersions: string[] = [],
): number[] {
  const skip = new Set(excludeVersions);
  const dates = sortedByGlobal(versions)
    .filter((v) => !skip.has(v.version) && v.releases[server])
    .map((v) => parseDate(v.releases[server]!));
  const gaps: number[] = [];
  for (let i = 1; i < dates.length; i++) gaps.push(daysBetween(dates[i - 1], dates[i]));
  return gaps;
}

// 指定服自身近期平均改版間隔（取最近 n 段，四捨五入）；不足一段回 null。
export function serverCadence(
  versions: Version[],
  server: ServerId,
  n: number,
  excludeVersions: string[] = [],
): number | null {
  const gaps = serverIntervals(versions, server, excludeVersions);
  if (gaps.length === 0) return null;
  const recent = gaps.slice(-n);
  return Math.round(recent.reduce((a, b) => a + b, 0) / recent.length);
}

// 該服改版最常落在的星期（0=週日 … 6=週六）；無資料回 null。
// FFXIV 各服改版固定於某一星期，用於把推估日對齊到正確的星期。
export function dominantWeekday(
  versions: Version[],
  server: ServerId,
  excludeVersions: string[] = [],
): number | null {
  const skip = new Set(excludeVersions);
  const days = sortedByGlobal(versions)
    .filter((v) => !skip.has(v.version) && v.releases[server])
    .map((v) => parseDate(v.releases[server]!).getUTCDay());
  if (days.length === 0) return null;
  const counts = new Map<number, number>();
  for (const day of days) counts.set(day, (counts.get(day) ?? 0) + 1);
  let best = days[days.length - 1];
  let bestN = 0;
  for (const [day, cnt] of counts) {
    if (cnt > bestN) {
      best = day;
      bestN = cnt;
    }
  }
  // 需至少兩版落在同一星期才視為「固定改版星期」，否則不套用對齊。
  return bestN >= 2 ? best : null;
}

// 將日期調整到最接近的指定星期（±3 天內，可能往前或往後）。
export function snapToWeekday(date: Date, weekday: number): Date {
  let diff = (weekday - date.getUTCDay() + 7) % 7; // 0..6，往後到該星期
  if (diff > 3) diff -= 7; // 取最近的一次（必要時往回）
  return addDays(date, diff);
}

// 追趕比率＝該服完成其共同版本所花的日曆時間 ÷ 國際服完成同一區間所花的時間。
// < 1 代表比國際服更快推進（正在追趕、落後縮小）；需至少兩個共同版本，否則回 null。
// recentN：只取最近 recentN+1 個共同版本計算（反映「收尾階段」較快的追趕速度）；
//          省略則用全部共同版本。
export function catchupRatio(
  versions: Version[],
  server: ServerId,
  recentN?: number,
): number | null {
  let common = sortedByGlobal(versions).filter((v) => v.releases.global && v.releases[server]);
  if (common.length < 2) return null;
  if (recentN !== undefined && recentN >= 1) common = common.slice(-(recentN + 1));
  const first = common[0];
  const last = common[common.length - 1];
  const serverSpan = daysBetween(parseDate(first.releases[server]!), parseDate(last.releases[server]!));
  const globalSpan = daysBetween(parseDate(first.releases.global!), parseDate(last.releases.global!));
  if (globalSpan <= 0) return null;
  return serverSpan / globalSpan;
}

// 參考追趕比率＝其他落後服（排除基準國際服與 server 本身）追趕比率的平均。
// 用於校正目標服（如繁中服）的推估：借用韓服／中服等「已追趕」的經驗。
export function referenceCatchupRatio(
  versions: Version[],
  server: ServerId,
  recentN?: number,
): number | null {
  const ids = new Set<ServerId>();
  for (const v of versions) {
    for (const k of Object.keys(v.releases) as ServerId[]) ids.add(k);
  }
  const ratios: number[] = [];
  for (const id of ids) {
    if (id === 'global' || id === server) continue;
    const r = catchupRatio(versions, id, recentN);
    if (r !== null) ratios.push(r);
  }
  if (ratios.length === 0) return null;
  return ratios.reduce((a, b) => a + b, 0) / ratios.length;
}

// 有效追趕比率：優先用目標服「自身」近期的追趕比率（該服已進入自身可觀測的節奏），
// 自身歷史不足（< 2 個共同版本）時才退回韓/中的參考追趕比率。
// 取代舊的「參考比率 × 手調積極度常數」——一旦目標服累積足夠共同版本，
// 官方已知日期本身就是最準的校準來源，不需再借他服經驗或手調旋鈕。
// recentN：自身比率只取最近 recentN+1 個共同版本（反映近期節奏）。
export function effectiveCatchupRatio(
  versions: Version[],
  server: ServerId,
  recentN?: number,
): number | null {
  const own = catchupRatio(versions, server, recentN);
  if (own !== null) return own;
  return referenceCatchupRatio(versions, server, recentN);
}

export type Confidence = 'high' | 'medium' | 'low';

export interface Prediction {
  server: ServerId;
  currentVersion: string | null; // 該服目前版本（null＝尚未有任何版本）
  nextVersion: string; // 預估的下一個版本號
  predictedDate: string; // 預估上線日 YYYY-MM-DD
  predictedIntervalDays: number; // 距上一版的推估間隔天數
  ownIntervalDays: number | null; // 該服自身近期平均改版間隔
  refRatio: number | null; // 使用的有效追趕比率（優先自校準，不足時取韓/中參考；<1 代表追趕時更快）
  lagDays: number | null; // 目前版本落後國際服天數（顯示用）
  method: 'blend' | 'own' | 'ref' | 'lag'; // 推估方式
  confidence: Confidence;
}

const DEFAULT_N = 3;

// 自校準追趕比率的取樣視窗：只看目標服「最近 CATCHUP_WINDOW 段」共同版本，
// 反映其近期節奏（前期猛追、後期回穩）而非整段平均。繁中近 2 段比率 ≈ 0.609。
const CATCHUP_WINDOW = 2;

// 預估指定服的下個版本上線日（混合模型）。
// 目標版本＝依國際服排序後，該服目前版本「之後」第一個尚未上線的版本。
//
// 以「該服自身近期改版節奏」乘上「有效追趕比率」得下一版間隔，
// 加到該服上一版日期得預估日；並以國際服該版日期為下限（不可早於來源）。
// 有效追趕比率 < 1，代表落後服在追趕期間會比自身歷史節奏更快；優先用該服自身
// 近期比率（自校準），自身歷史不足時才退回韓/中參考比率。
//  - blend：自身節奏 × 有效追趕比率（兩者都有）。
//  - own / ref：僅其中一種可用（own=自身節奏；ref=國際服間隔 × 係數）。
//  - lag：都不可用時，退回「國際服日期 + 平均落後天數」。
// 該服已上線所有已知版本、或完全無資料可推估時回 null。
export function predictNext(
  versions: Version[],
  server: ServerId,
  now: Date,
  n: number = DEFAULT_N,
  excludeCadenceVersions: string[] = [],
): Prediction | null {
  const sorted = sortedByGlobal(versions);
  const current = currentVersion(versions, server, now);

  // 目標＝該服目前版本「之後」第一個尚未上線的版本。晚加入的服才不會誤取舊版本。
  const startIndex = current ? sorted.findIndex((v) => v.version === current.version) + 1 : 0;
  const target = sorted.slice(startIndex).find((v) => !v.releases[server]);
  if (!target) return null; // 該服已有全部版本

  const lag = current ? lagDays(current, server) : null;
  const gCur = current?.releases.global;
  const gNext = target.releases.global;
  const globalInterval = gCur && gNext ? daysBetween(parseDate(gCur), parseDate(gNext)) : null;

  const ownInterval = serverCadence(versions, server, n, excludeCadenceVersions);
  // 有效追趕比率：優先自校準（該服自身近期），不足時退回韓/中參考。
  const refRatio = effectiveCatchupRatio(versions, server, CATCHUP_WINDOW);
  const canRef = refRatio !== null && globalInterval !== null;

  const lastServer = current?.releases[server];

  // 主要路徑：以自身節奏 × 有效追趕比率推估「距上一版的間隔」。
  if (lastServer && (ownInterval !== null || canRef)) {
    let interval: number;
    let method: Prediction['method'];
    if (ownInterval !== null && refRatio !== null) {
      interval = Math.round(ownInterval * refRatio);
      method = 'blend';
    } else if (ownInterval !== null) {
      interval = ownInterval;
      method = 'own';
    } else {
      interval = Math.round(globalInterval! * refRatio!);
      method = 'ref';
    }

    let predicted = addDays(parseDate(lastServer), interval);
    // 對齊到該服固定的改版星期。
    const weekday = dominantWeekday(versions, server, excludeCadenceVersions);
    if (weekday !== null) predicted = snapToWeekday(predicted, weekday);
    // 下限：不可早於國際服該版上線日（必要時整週後移以維持星期）。
    if (gNext) {
      const floor = parseDate(gNext).getTime();
      while (predicted.getTime() < floor) predicted = addDays(predicted, weekday !== null ? 7 : 1);
    }

    const ownCount = serverIntervals(versions, server, excludeCadenceVersions).length;
    const confidence: Confidence =
      method === 'blend' ? (ownCount >= 2 ? 'high' : 'medium') : 'medium';

    return {
      server,
      currentVersion: current?.version ?? null,
      nextVersion: target.version,
      predictedDate: formatISODate(predicted),
      predictedIntervalDays: interval,
      ownIntervalDays: ownInterval,
      refRatio,
      lagDays: lag,
      method,
      confidence,
    };
  }

  // 退回：無節奏資料時，用「國際服日期 + 平均落後天數」。
  const avgLag = averageLag(versions, server, n);
  if (avgLag === null || !gNext) return null;
  const predicted = addDays(parseDate(gNext), avgLag);
  return {
    server,
    currentVersion: current?.version ?? null,
    nextVersion: target.version,
    predictedDate: formatISODate(predicted),
    predictedIntervalDays: lastServer ? daysBetween(parseDate(lastServer), predicted) : avgLag,
    ownIntervalDays: null,
    refRatio: null,
    lagDays: lag,
    method: 'lag',
    confidence: 'low',
  };
}

export interface FutureRelease {
  version: string;
  predictedDate: string; // 上線日 YYYY-MM-DD（official=true 時為官方公告日，否則為預估）
  intervalDays: number; // 距前一版（實際或預估）的天數
  official?: boolean; // true＝該服此版已有官方公告日期（非演算法預估），僅是尚未到來
}

// 連續推估該服「目前版本之後所有尚未上線版本」的上線日。
//
// 每一段間隔＝「國際服該段間隔 × 有效追趕比率」，逐段累加、各自以國際服日期為下限。
// 這樣會沿用國際服各段的「形狀」：小改版短、資料片交界（x.55→(x+1).0）長，
// 而非一律套同一個平均步進。全程加總 = 國際服剩餘跨距 × 係數，與 catchupRatio 定義一致。
// 缺追趕係數或國際服日期時，退回自身平均節奏；再不行則用「國際服日期 + 平均落後」。
export function predictSequence(
  versions: Version[],
  server: ServerId,
  now: Date,
  n: number = DEFAULT_N,
  excludeCadenceVersions: string[] = [],
): FutureRelease[] {
  const sorted = sortedByGlobal(versions);
  const current = currentVersion(versions, server, now);
  const startIndex = current ? sorted.findIndex((v) => v.version === current.version) + 1 : 0;
  if (!sorted.slice(startIndex).some((v) => !v.releases[server])) return []; // 已無可推估版本

  const ownInterval = serverCadence(versions, server, n, excludeCadenceVersions);
  // 追趕係數：國際服各段間隔 × 此係數 = 該服對應段的預估間隔。
  // 優先用該服自身近期比率（自校準），不足時退回韓/中參考。
  const catchup = effectiveCatchupRatio(versions, server, CATCHUP_WINDOW);

  const avgLag = averageLag(versions, server, n);
  const weekday = dominantWeekday(versions, server, excludeCadenceVersions);
  let prev = current?.releases[server] ? parseDate(current.releases[server]!) : null;

  const out: FutureRelease[] = [];
  for (let idx = startIndex; idx < sorted.length; idx++) {
    const v = sorted[idx];
    // 該版此服已有日期：官方已公告但尚未到來 → 以 official 呈現（非預估）；
    // 已過去者（已上線）則推進基準後略過，交由對照表呈現，不列入預測。
    if (v.releases[server]) {
      const known = parseDate(v.releases[server]!);
      if (known.getTime() > now.getTime()) {
        const intervalDays = prev ? daysBetween(prev, known) : 0;
        out.push({
          version: v.version,
          predictedDate: v.releases[server]!,
          intervalDays,
          official: true,
        });
      }
      prev = known;
      continue;
    }
    const gPrev = sorted[idx - 1]?.releases.global;
    const gCur = v.releases.global;

    // 每段間隔：優先「國際服該段間隔 × 追趕係數」；退回自身平均節奏。
    let interval: number | null = null;
    if (catchup !== null && gPrev && gCur) {
      interval = Math.round(daysBetween(parseDate(gPrev), parseDate(gCur)) * catchup);
    } else if (ownInterval !== null) {
      interval = ownInterval;
    }

    let predicted: Date;
    if (interval !== null && prev) {
      predicted = addDays(prev, interval);
    } else if (gCur && avgLag !== null) {
      predicted = addDays(parseDate(gCur), avgLag);
    } else {
      break; // 無法再推估
    }
    // 對齊到該服固定的改版星期。
    if (weekday !== null) predicted = snapToWeekday(predicted, weekday);
    // 下限：不可早於國際服該版上線日（必要時整週後移）。
    if (gCur) {
      const floor = parseDate(gCur).getTime();
      while (predicted.getTime() < floor) predicted = addDays(predicted, weekday !== null ? 7 : 1);
    }
    const intervalDays = prev ? daysBetween(prev, predicted) : (interval ?? avgLag ?? 0);
    out.push({ version: v.version, predictedDate: formatISODate(predicted), intervalDays });
    prev = predicted;
  }
  return out;
}
