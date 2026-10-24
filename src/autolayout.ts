import { autoTcy } from "../vendor/shinbun.js";
import type { LayoutRequest, LayoutResponse } from "./layout-worker.ts";
import { findNearestFreeRect } from "./grid.ts";
import { overflows } from "./overflow.ts";
import { buildItem, buildPaper } from "./render.ts";
import { autoSideways } from "./sideways.ts";
import type { Item, Rect, State } from "./types.ts";

export interface Query {
  id: string;
  span: number;
}

export interface Measured extends Query {
  lines: number | null;
}

export interface ProblemItem {
  id: string;
  role: Item["kind"];
  priority: number;
  chars?: number;
  headline?: string;
  lead?: boolean;
  ratio?: number;
  caption?: boolean;
}

export interface Problem {
  paper: { writing: string; dan: number; lines: number; chars: number; column_em?: number; gap_em?: number };
  items: ProblemItem[];
}

export interface Solution {
  layout: { placements: (Rect & { id: string })[] };
  unplaced: { id: string; reason: string }[];
}

const HEADLINE_PRIORITY = { xl: 9, l: 8, m: 6, s: 3 } as const;

export function toProblem(state: State, ratios: Map<string, number>, columns?: { column_em: number; gap_em: number }): Problem {
  const { writing, dan, lines, chars } = state.paper;
  const items = state.items.map((it): ProblemItem => {
    switch (it.kind) {
      case "article":
        return {
          id: it.id,
          role: "article",
          priority: it.isLead ? 10 : HEADLINE_PRIORITY[it.headlineSize],
          chars: (it.lead + it.body).replace(/\s/g, "").length,
          headline: it.headlineSize,
          lead: it.isLead,
        };
      case "box":
        return { id: it.id, role: "box", priority: 3, chars: (it.title + it.body).replace(/\s/g, "").length };
      case "photo": {
        const ratio = ratios.get(it.id);
        return { id: it.id, role: "photo", priority: 6, caption: it.caption !== "", ...(ratio ? { ratio } : {}) };
      }
      case "nameplate":
        return { id: it.id, role: "nameplate", priority: 10 };
      case "yoko":
        return { id: it.id, role: "yoko", priority: 4 };
      case "ad":
        return { id: it.id, role: "ad", priority: 3 };
    }
  });
  return { paper: { writing, dan, lines, chars, ...columns }, items };
}

export async function minimalLines(
  queries: Query[],
  max: number,
  fits: (tries: (Query & { w: number })[]) => Promise<boolean[]>,
): Promise<Measured[]> {
  const top = await fits(queries.map((q) => ({ ...q, w: max })));
  const open = queries.flatMap((q, i) => (top[i] ? [{ q, lo: 1, hi: max }] : []));
  for (;;) {
    const pending = open.filter((s) => s.lo < s.hi);
    if (pending.length === 0) break;
    const mids = pending.map((s) => Math.floor((s.lo + s.hi) / 2));
    const ok = await fits(pending.map((s, i) => ({ ...s.q, w: mids[i]! })));
    pending.forEach((s, i) => {
      if (ok[i]) s.hi = mids[i]!;
      else s.lo = mids[i]! + 1;
    });
  }
  const found = new Map(open.map((s) => [`${s.q.id}:${s.q.span}`, s.hi]));
  return queries.map((q) => ({ ...q, lines: found.get(`${q.id}:${q.span}`) ?? null }));
}

function domFits(state: State, host: HTMLElement) {
  return async (tries: (Query & { w: number })[]): Promise<boolean[]> => {
    const paper = buildPaper({ ...state, items: [] });
    const page = paper.querySelector<HTMLElement>(".sb-page")!;
    tries.forEach((t, i) => {
      const item = state.items.find((it) => it.id === t.id)!;
      const el = buildItem({ ...item, x: 1, w: t.w, y: 1, span: t.span } as Item);
      el.dataset.id = String(i);
      page.append(el);
    });
    host.replaceChildren(paper);
    if (state.paper.writing === "vertical") {
      autoTcy(paper);
      autoSideways(paper);
    }
    await document.fonts.ready;
    return [...page.children].map((el) => !overflows(el as HTMLElement));
  };
}

function columnsOf(state: State, host: HTMLElement): { column_em: number; gap_em: number } | undefined {
  if (state.paper.writing !== "horizontal") return undefined;
  const paper = buildPaper({ ...state, items: [] });
  host.replaceChildren(paper);
  const cs = getComputedStyle(paper.querySelector(".sb-page")!);
  const fs = Number.parseFloat(getComputedStyle(paper).getPropertyValue("--sb-fs")) * Number.parseFloat(getComputedStyle(document.documentElement).fontSize);
  const column = Number.parseFloat(cs.gridTemplateColumns.split(" ")[0] ?? "");
  const gap = Number.parseFloat(cs.columnGap);
  if (!(fs > 0 && column > 0)) return undefined;
  return { column_em: column / fs, gap_em: (Number.isFinite(gap) ? gap : fs) / fs };
}

async function photoRatios(state: State): Promise<Map<string, number>> {
  const out = new Map<string, number>();
  for (const it of state.items) {
    if (it.kind !== "photo" || !it.image) continue;
    const img = new Image();
    img.src = it.image;
    try {
      await img.decode();
      if (img.naturalWidth > 0 && img.naturalHeight > 0) out.set(it.id, img.naturalWidth / img.naturalHeight);
    } catch {
      continue;
    }
  }
  return out;
}

let worker: Worker | null = null;
let nextId = 0;

type Request = LayoutRequest extends infer T ? (T extends LayoutRequest ? Omit<T, "id"> : never) : never;

function call(req: Request): Promise<string> {
  worker ??= new Worker(new URL("./layout-worker.ts", import.meta.url), { type: "module" });
  const w = worker;
  const id = ++nextId;
  return new Promise((resolve, reject) => {
    const onMessage = (e: MessageEvent<LayoutResponse>) => {
      if (e.data.id !== id) return;
      w.removeEventListener("message", onMessage);
      if ("error" in e.data) reject(new Error(e.data.error));
      else resolve(e.data.result);
    };
    w.addEventListener("message", onMessage);
    w.postMessage({ ...req, id } as LayoutRequest);
  });
}


export async function autoLayout(state: State): Promise<{ rects: Map<string, Rect>; unplaced: Item[] }> {
  const host = document.createElement("div");
  host.setAttribute("aria-hidden", "true");
  host.style.cssText = "position:absolute;left:-100000px;top:0;visibility:hidden;pointer-events:none";
  document.body.append(host);
  try {
    const problem = toProblem(state, await photoRatios(state), columnsOf(state, host));
    const problemJson = JSON.stringify(problem);
    const queries = JSON.parse(await call({ type: "measurements", problem: problemJson })) as Query[];
    const table = await minimalLines(queries, state.paper.lines, domFits(state, host));
    const solution = JSON.parse(await call({ type: "solve", problem: problemJson, table: JSON.stringify(table) })) as Solution;
    const rects = new Map<string, Rect>(solution.layout.placements.map(({ id, x, w, y, span }) => [id, { x, w, y, span }]));
    const unplaced = solution.unplaced.map((u) => state.items.find((it) => it.id === u.id)!).filter(Boolean);
    for (const it of unplaced) {
      const free = findNearestFreeRect([...rects.values()], state.paper, it);
      rects.set(it.id, free ?? { x: it.x, w: it.w, y: it.y, span: it.span });
    }
    return { rects, unplaced };
  } finally {
    host.remove();
  }
}
