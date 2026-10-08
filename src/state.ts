import { LIMITS, clampRect } from "./grid.ts";
import type { Item, Kind, Paper, Rect, State, Writing } from "./types.ts";

export const PAPER_DEFAULTS: Record<Writing, Paper> = {
  vertical: { writing: "vertical", dan: 10, lines: 50, chars: 10, fs: 0.72 },
  horizontal: { writing: "horizontal", dan: 6, lines: 40, chars: 10, fs: 0.9 },
};

type Of<K extends Kind> = Extract<Item, { kind: K }>;
type Fields<K extends Kind> = Omit<Of<K>, "id" | "kind" | keyof Rect>;

export const KINDS: { [K in Kind]: { label: string; size: { w: number; span: number }; fields: Fields<K> } } = {
  nameplate: { label: "題字", size: { w: 8, span: 3 }, fields: { title: "架空新聞", meta: "朝刊" } },
  article: {
    label: "記事",
    size: { w: 14, span: 4 },
    fields: {
      kicker: "",
      headline: "見出しを入れる",
      headlineSize: "m",
      sleeve: "",
      dateline: "",
      lead: "",
      body: "本文を入れます。空の行で、段落を分けます。\n\n二つ目の段落です。",
      byline: "",
      isLead: false,
    },
  },
  photo: { label: "写真", size: { w: 10, span: 3 }, fields: { image: "", caption: "写真の説明" } },
  box: { label: "囲み", size: { w: 8, span: 3 }, fields: { title: "囲みの見出し", body: "囲みの本文です。" } },
  yoko: { label: "横見出し", size: { w: 30, span: 1 }, fields: { text: "横見出し", reverse: true, size: 1.6 } },
  ad: { label: "広告枠", size: { w: 10, span: 3 }, fields: { label: "広告" } },
};

export const KIND_LIST = Object.keys(KINDS) as Kind[];

let counter = 0;
const newId = () => `i${Date.now().toString(36)}${(counter++).toString(36)}`;

export function createState(writing: Writing = "vertical"): State {
  return { paper: { ...PAPER_DEFAULTS[writing] }, items: [] };
}

function num(v: unknown, min: number, max: number, fallback: number): number {
  const n = Number(v);
  return Number.isFinite(n) ? Math.min(Math.max(n, min), max) : fallback;
}

export function normalizePaper(p: Partial<Paper> | null | undefined): Paper {
  const writing: Writing = p?.writing === "horizontal" ? "horizontal" : "vertical";
  const d = PAPER_DEFAULTS[writing];
  return {
    writing,
    dan: Math.round(num(p?.dan, 1, LIMITS.dan, d.dan)),
    lines: Math.round(num(p?.lines, 1, LIMITS.lines, d.lines)),
    chars: Math.round(num(p?.chars, 4, 30, d.chars)),
    fs: num(p?.fs, 0.4, 2, d.fs),
  };
}

export function makeItem<K extends Kind>(kind: K, rect: Rect, overrides: Partial<Fields<K>> & { id?: string } = {}): Of<K> {
  return { ...structuredClone(KINDS[kind].fields), ...rect, ...overrides, id: overrides.id ?? newId(), kind } as unknown as Of<K>;
}

function pickFields(kind: Kind, raw: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, def] of Object.entries(KINDS[kind].fields)) {
    if (typeof raw[key] === typeof def) out[key] = raw[key];
  }
  return out;
}

export function normalizeState(raw: unknown): State {
  const src = (raw ?? {}) as { paper?: Partial<Paper>; items?: unknown };
  const paper = normalizePaper(src.paper);
  const items: Item[] = [];
  for (const entry of Array.isArray(src.items) ? src.items : []) {
    const it = entry as Record<string, unknown> | null;
    const kind = it?.kind as Kind | undefined;
    if (!it || !kind || !(kind in KINDS)) continue;
    const rect = clampRect({ x: Number(it.x), w: Number(it.w), y: Number(it.y), span: Number(it.span) }, paper);
    const id = typeof it.id === "string" ? it.id : undefined;
    items.push(makeItem(kind, rect, { ...pickFields(kind, it), id }) as Item);
  }
  return { paper, items };
}

export class History {
  past: string[] = [];
  future: string[] = [];

  limit: number;

  constructor(limit = 100) {
    this.limit = limit;
  }

  push(state: State): void {
    this.past.push(JSON.stringify(state));
    if (this.past.length > this.limit) this.past.shift();
    this.future = [];
  }

  undo(current: State): State | null {
    const prev = this.past.pop();
    if (prev === undefined) return null;
    this.future.push(JSON.stringify(current));
    return JSON.parse(prev) as State;
  }

  redo(current: State): State | null {
    const next = this.future.pop();
    if (next === undefined) return null;
    this.past.push(JSON.stringify(current));
    return JSON.parse(next) as State;
  }
}

export function switchWriting(state: State, writing: Writing): State {
  const paper = { ...PAPER_DEFAULTS[writing] };
  return { paper, items: state.items.map((it) => ({ ...it, ...clampRect(it, paper) })) };
}

export function itemTitle(it: Item): string {
  const text = { nameplate: (i: Of<"nameplate">) => i.title, article: (i: Of<"article">) => i.headline, photo: (i: Of<"photo">) => i.caption, box: (i: Of<"box">) => i.title, yoko: (i: Of<"yoko">) => i.text, ad: (i: Of<"ad">) => i.label }[it.kind] as (i: Item) => string;
  return `${KINDS[it.kind].label}: ${text(it) || "（空）"}`;
}
