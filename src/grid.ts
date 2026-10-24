import type { Rect, Writing } from "./types.ts";

export const LIMITS = { dan: 15, lines: 60 };

export interface AxisInfo {
  axis: "x" | "y";
  reverse: boolean;
}

export function axesOf(writing: Writing): { dan: AxisInfo; line: AxisInfo } {
  return writing === "horizontal"
    ? { dan: { axis: "x", reverse: false }, line: { axis: "y", reverse: false } }
    : { dan: { axis: "y", reverse: false }, line: { axis: "x", reverse: true } };
}

export function trackStarts(sizes: number[], gap: number, pad = 0): number[] {
  const starts: number[] = [];
  let pos = pad;
  for (const s of sizes) {
    starts.push(pos);
    pos += s + gap;
  }
  return starts;
}

export function indexAt(sizes: number[], gap: number, pad: number, offset: number): number {
  const starts = trackStarts(sizes, gap, pad);
  let found = 1;
  starts.forEach((start, i) => {
    if (offset >= start - gap / 2) found = i + 1;
  });
  return Math.min(Math.max(found, 1), sizes.length);
}

export interface Box {
  left: number;
  right: number;
  top: number;
  bottom: number;
}

export function offsetOnAxis(info: AxisInfo, box: Box, point: { x: number; y: number }): number {
  if (info.axis === "x") return info.reverse ? box.right - point.x : point.x - box.left;
  return info.reverse ? box.bottom - point.y : point.y - box.top;
}

export function overlaps(a: Rect, b: Rect): boolean {
  return a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.span && b.y < a.y + a.span;
}

export function clampRect(rect: Rect, size: { dan: number; lines: number }): Rect {
  const w = Math.min(Math.max(Math.round(rect.w), 1), size.lines);
  const span = Math.min(Math.max(Math.round(rect.span), 1), size.dan);
  const x = Math.min(Math.max(Math.round(rect.x), 1), size.lines - w + 1);
  const y = Math.min(Math.max(Math.round(rect.y), 1), size.dan - span + 1);
  return { x, w, y, span };
}

export function findFreeRect(others: Rect[], size: { dan: number; lines: number }, w: number, span: number): Rect {
  const fit = clampRect({ x: 1, y: 1, w, span }, size);
  for (let y = 1; y + fit.span - 1 <= size.dan; y++) {
    for (let x = 1; x + fit.w - 1 <= size.lines; x++) {
      const cand = { x, y, w: fit.w, span: fit.span };
      if (!others.some((o) => overlaps(cand, o))) return cand;
    }
  }
  return fit;
}

export function scaleRect(rect: Rect, from: { dan: number; lines: number }, to: { dan: number; lines: number }): Rect {
  const kx = to.lines / from.lines;
  const ky = to.dan / from.dan;
  const x = Math.round((rect.x - 1) * kx) + 1;
  const y = Math.round((rect.y - 1) * ky) + 1;
  const xEnd = Math.round((rect.x - 1 + rect.w) * kx);
  const yEnd = Math.round((rect.y - 1 + rect.span) * ky);
  return clampRect({ x, y, w: Math.max(1, xEnd - x + 1), span: Math.max(1, yEnd - y + 1) }, to);
}

export function findNearestFreeRect(others: Rect[], size: { dan: number; lines: number }, want: Rect): Rect | null {
  const fit = clampRect(want, size);
  const sizes: { w: number; span: number }[] = [];
  for (let w = fit.w; w >= 1; w--) for (let span = fit.span; span >= 1; span--) sizes.push({ w, span });
  sizes.sort((a, b) => b.w * b.span - a.w * a.span);
  for (const { w, span } of sizes) {
    let best: Rect | null = null;
    let bestDist = Infinity;
    for (let y = 1; y + span - 1 <= size.dan; y++) {
      for (let x = 1; x + w - 1 <= size.lines; x++) {
        const cand = { x, y, w, span };
        if (others.some((o) => overlaps(cand, o))) continue;
        const dist = Math.abs(x - fit.x) / size.lines + Math.abs(y - fit.y) / size.dan;
        if (dist < bestDist) {
          best = cand;
          bestDist = dist;
        }
      }
    }
    if (best) return best;
  }
  return null;
}

export function arrange<T extends Rect & { id: string }>(
  items: T[],
  size: { dan: number; lines: number },
  targets: Map<string, Rect>,
  keep: (a: T, b: T) => boolean = () => false,
): T[] {
  const wants = new Map(items.map((it) => [it.id, clampRect(targets.get(it.id) ?? it, size)]));
  const total = [...wants.values()].reduce((sum, r) => sum + r.w * r.span, 0);
  const capacity = size.dan * size.lines;
  if (total > capacity) {
    const k = Math.sqrt(capacity / total);
    for (const [id, r] of wants) wants.set(id, { ...r, w: Math.max(1, Math.floor(r.w * k)), span: Math.max(1, Math.floor(r.span * k)) });
  }
  const placed = new Map<string, Rect>();
  const stays = (it: T) => {
    const t = wants.get(it.id)!;
    return t.x === it.x && t.y === it.y && t.w === it.w && t.span === it.span ? 0 : 1;
  };
  const order = [...items].sort((a, b) => stays(a) - stays(b) || b.w * b.span - a.w * a.span);
  for (const it of order) {
    const want = wants.get(it.id)!;
    const blockers = order.filter((o) => placed.has(o.id) && !keep(it, o)).map((o) => placed.get(o.id)!);
    const free = blockers.some((b) => overlaps(want, b)) ? findNearestFreeRect(blockers, size, want) : want;
    placed.set(it.id, free ?? want);
  }
  return items.map((it) => ({ ...it, ...placed.get(it.id)! }));
}

export interface Growth {
  rect: Rect;
  shrunk: { id: string; rect: Rect }[];
}

export function growOptions<T extends Rect & { id: string }>(
  rect: Rect,
  others: T[],
  size: { dan: number; lines: number },
  prefer: (it: T) => boolean = () => false,
): Growth[] {
  const candidates: { rect: Rect; strip: Rect; axis: "x" | "y"; at: number }[] = [
    { rect: { ...rect, w: rect.w + 1 }, strip: { ...rect, x: rect.x + rect.w, w: 1 }, axis: "x", at: rect.x + rect.w },
    { rect: { ...rect, x: rect.x - 1, w: rect.w + 1 }, strip: { ...rect, x: rect.x - 1, w: 1 }, axis: "x", at: rect.x - 1 },
    { rect: { ...rect, span: rect.span + 1 }, strip: { ...rect, y: rect.y + rect.span, span: 1 }, axis: "y", at: rect.y + rect.span },
    { rect: { ...rect, y: rect.y - 1, span: rect.span + 1 }, strip: { ...rect, y: rect.y - 1, span: 1 }, axis: "y", at: rect.y - 1 },
  ];
  const inside = (c: Rect) => c.x >= 1 && c.y >= 1 && c.x + c.w - 1 <= size.lines && c.y + c.span - 1 <= size.dan;
  const ranked: { growth: Growth; rank: number }[] = [];
  for (const c of candidates) {
    if (!inside(c.rect)) continue;
    const blockers = others.filter((o) => overlaps(c.strip, o));
    const shrunk = blockers.map((b) => ({ id: b.id, rect: cutEdge(b, c.axis, c.at) }));
    if (shrunk.some((b) => !b.rect)) continue;
    const rank = blockers.length === 0 ? 0 : blockers.every(prefer) ? 1 : 2;
    ranked.push({ growth: { rect: c.rect, shrunk: shrunk as Growth["shrunk"] }, rank });
  }
  return ranked.sort((a, b) => a.rank - b.rank).map((r) => r.growth);
}

function cutEdge({ x, w, y, span }: Rect, axis: "x" | "y", at: number): Rect | null {
  const rect = { x, w, y, span };
  if (axis === "x") {
    if (rect.w < 2) return null;
    if (at === rect.x) return { ...rect, x: rect.x + 1, w: rect.w - 1 };
    if (at === rect.x + rect.w - 1) return { ...rect, w: rect.w - 1 };
    return null;
  }
  if (rect.span < 2) return null;
  if (at === rect.y) return { ...rect, y: rect.y + 1, span: rect.span - 1 };
  if (at === rect.y + rect.span - 1) return { ...rect, span: rect.span - 1 };
  return null;
}

export function overlappingIds(items: (Rect & { id: string })[]): Set<string> {
  const ids = new Set<string>();
  items.forEach((a, i) => {
    for (const b of items.slice(i + 1)) {
      if (overlaps(a, b)) {
        ids.add(a.id);
        ids.add(b.id);
      }
    }
  });
  return ids;
}

export type Edge = "start" | "end";

export interface Corner {
  dan: Edge;
  line: Edge;
}

export function resizeRect(rect: Rect, corner: Corner, cell: { dan: number; line: number }): Rect {
  let { x, w, y, span } = rect;
  const yEnd = y + span - 1;
  const xEnd = x + w - 1;
  if (corner.dan === "end") span = Math.max(1, cell.dan - y + 1);
  else {
    y = Math.min(cell.dan, yEnd);
    span = yEnd - y + 1;
  }
  if (corner.line === "end") w = Math.max(1, cell.line - x + 1);
  else {
    x = Math.min(cell.line, xEnd);
    w = xEnd - x + 1;
  }
  return { x, w, y, span };
}

const ARROWS: Record<Writing, Record<string, { dan: number; line: number }>> = {
  vertical: {
    ArrowUp: { dan: -1, line: 0 },
    ArrowDown: { dan: 1, line: 0 },
    ArrowLeft: { dan: 0, line: 1 },
    ArrowRight: { dan: 0, line: -1 },
  },
  horizontal: {
    ArrowLeft: { dan: -1, line: 0 },
    ArrowRight: { dan: 1, line: 0 },
    ArrowUp: { dan: 0, line: -1 },
    ArrowDown: { dan: 0, line: 1 },
  },
};

export function nudge(rect: Rect, key: string, writing: Writing, resize: boolean): Rect | null {
  const d = ARROWS[writing][key];
  if (!d) return null;
  return resize
    ? { ...rect, span: rect.span + d.dan, w: rect.w + d.line }
    : { ...rect, y: rect.y + d.dan, x: rect.x + d.line };
}
