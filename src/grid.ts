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
