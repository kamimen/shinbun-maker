import { clampRect } from "./grid.ts";
import { readImage } from "./image.ts";
import { KINDS, normalizePaper } from "./state.ts";
import type { Store } from "./store.ts";
import type { Item, Kind, Paper } from "./types.ts";

interface Field {
  key: string;
  label: string;
  type: "text" | "textarea" | "select" | "checkbox" | "number";
  options?: [string, string][];
  step?: number;
  min?: number;
  max?: number;
}

const SIZES: [string, string][] = [
  ["xl", "特大"],
  ["l", "大"],
  ["m", "中"],
  ["s", "小"],
];

const FIELDS: Record<Kind, Field[]> = {
  nameplate: [
    { key: "title", label: "題字", type: "text" },
    { key: "meta", label: "題字の下", type: "text" },
  ],
  article: [
    { key: "kicker", label: "肩見出し", type: "text" },
    { key: "headline", label: "見出し", type: "text" },
    { key: "headlineSize", label: "見出しの大きさ", type: "select", options: SIZES },
    { key: "sleeve", label: "袖見出し", type: "text" },
    { key: "dateline", label: "発信地", type: "text" },
    { key: "lead", label: "リード", type: "textarea" },
    { key: "body", label: "本文（空の行で段落を分ける）", type: "textarea" },
    { key: "byline", label: "署名", type: "text" },
    { key: "isLead", label: "トップ記事（下に二重罫）", type: "checkbox" },
  ],
  photo: [{ key: "caption", label: "説明", type: "text" }],
  box: [
    { key: "title", label: "囲みの見出し", type: "text" },
    { key: "body", label: "本文", type: "textarea" },
  ],
  yoko: [
    { key: "text", label: "見出し", type: "text" },
    { key: "size", label: "大きさ（em）", type: "number", step: 0.1, min: 0.6, max: 6 },
    { key: "reverse", label: "白抜き（黒地）", type: "checkbox" },
  ],
  ad: [{ key: "label", label: "表示する文字", type: "text" }],
};

function row(label: string, control: HTMLElement): HTMLElement {
  const wrap = document.createElement("label");
  wrap.className = "field";
  const span = document.createElement("span");
  span.textContent = label;
  wrap.append(span, control);
  return wrap;
}

function input(type: string, value: string | number, attrs: Record<string, string | number> = {}): HTMLInputElement {
  const node = document.createElement("input");
  node.type = type;
  node.value = String(value);
  for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, String(v));
  return node;
}

function select(options: [string, string][], value: string): HTMLSelectElement {
  const node = document.createElement("select");
  for (const [v, label] of options) node.append(new Option(label, v, false, v === value));
  return node;
}

export function createPanel(host: HTMLElement, store: Store) {
  let lastKey = "";
  let lastTime = 0;

  function shouldRecord(key: string): boolean {
    const now = Date.now();
    const record = key !== lastKey || now - lastTime > 1000;
    lastKey = key;
    lastTime = now;
    return record;
  }

  function bind(item: Item, f: Field): HTMLElement {
    const current = (item as unknown as Record<string, unknown>)[f.key];
    if (f.type === "checkbox") {
      const box = input("checkbox", "");
      box.checked = Boolean(current);
      box.addEventListener("change", () => store.update(item.id, { [f.key]: box.checked } as Partial<Item>, "panel"));
      return row(f.label, box);
    }
    if (f.type === "select") {
      const sel = select(f.options ?? [], String(current));
      sel.addEventListener("change", () => store.update(item.id, { [f.key]: sel.value } as Partial<Item>, "panel"));
      return row(f.label, sel);
    }
    if (f.type === "textarea") {
      const area = document.createElement("textarea");
      area.rows = f.key === "lead" ? 3 : 8;
      area.value = String(current ?? "");
      area.addEventListener("input", () => store.update(item.id, { [f.key]: area.value } as Partial<Item>, "panel", shouldRecord(f.key)));
      return row(f.label, area);
    }
    const field =
      f.type === "number"
        ? input("number", String(current), { step: f.step ?? 1, min: f.min ?? 0, max: f.max ?? 99 })
        : input("text", String(current ?? ""));
    field.addEventListener("input", () => {
      const value = f.type === "number" ? Number(field.value) : field.value;
      if (f.type === "number" && !Number.isFinite(value)) return;
      store.update(item.id, { [f.key]: value } as Partial<Item>, "panel", shouldRecord(f.key));
    });
    return row(f.label, field);
  }

  function position(item: Item): HTMLElement {
    const group = document.createElement("div");
    group.className = "position";
    const { dan, lines } = store.state.paper;
    const defs: [keyof Pick<Item, "x" | "w" | "y" | "span">, string, number][] = [
      ["y", "段（開始）", dan],
      ["span", "段数", dan],
      ["x", "行（開始）", lines],
      ["w", "行数", lines],
    ];
    for (const [key, label, max] of defs) {
      const field = input("number", item[key], { min: 1, max, step: 1 });
      field.addEventListener("change", () => {
        const next = clampRect({ x: item.x, w: item.w, y: item.y, span: item.span, [key]: Number(field.value) }, store.state.paper);
        store.update(item.id, next, "other");
      });
      group.append(row(label, field));
    }
    return group;
  }

  function photoControls(item: Item): HTMLElement {
    const wrap = document.createElement("div");
    wrap.className = "photo-controls";
    const file = input("file", "", { accept: "image/*" });
    file.value = "";
    file.addEventListener("change", async () => {
      const f = file.files?.[0];
      if (!f) return;
      try {
        store.update(item.id, { image: await readImage(f) } as Partial<Item>, "other");
      } catch {
        alert("画像を読み込めませんでした");
      }
    });
    const clear = document.createElement("button");
    clear.type = "button";
    clear.textContent = "画像を外す";
    clear.addEventListener("click", () => store.update(item.id, { image: "" } as Partial<Item>, "other"));
    wrap.append(row("画像（端末の中だけで扱います）", file), clear);
    return wrap;
  }

  function paperForm(): HTMLElement {
    const form = document.createElement("div");
    const { paper } = store.state;
    const writing = select(
      [
        ["vertical", "縦組み"],
        ["horizontal", "横組み"],
      ],
      paper.writing,
    );
    writing.addEventListener("change", () => store.setWriting(writing.value as Paper["writing"]));
    form.append(row("組方向（切り替えると、段数などは初期値に戻る）", writing));
    const defs: [keyof Pick<Paper, "dan" | "lines" | "chars" | "fs">, string, number, number, number][] = [
      ["dan", "段数", 1, 15, 1],
      ["lines", "行数", 1, 60, 1],
      ["chars", "1 段の字数", 4, 30, 1],
      ["fs", "文字の大きさ（rem）", 0.4, 2, 0.02],
    ];
    for (const [key, label, min, max, step] of defs) {
      const field = input("number", paper[key], { min, max, step });
      field.addEventListener("change", () => store.setPaper(normalizePaper({ ...store.state.paper, [key]: Number(field.value) })));
      form.append(row(label, field));
    }
    return form;
  }

  function render(): void {
    host.replaceChildren();
    const item = store.selected;
    const title = document.createElement("h2");
    if (!item) {
      title.textContent = "紙面の設定";
      host.append(title, paperForm());
      return;
    }
    title.textContent = KINDS[item.kind].label;
    const del = document.createElement("button");
    del.type = "button";
    del.className = "danger";
    del.textContent = "この部品を削除";
    del.addEventListener("click", () => store.remove(item.id));
    const hint = document.createElement("p");
    hint.className = "hint";
    hint.textContent =
      store.state.paper.writing === "vertical"
        ? "段は上から、行は右から数えます。段は紙面を上下に区切った幅、行は文字の列です。"
        : "段は左から、行は上から数えます。段は紙面を左右に区切った幅、行は文字の行です。";
    host.append(title, hint, position(item));
    for (const f of FIELDS[item.kind]) host.append(bind(item, f));
    if (item.kind === "photo") host.append(photoControls(item));
    const order = document.createElement("div");
    order.className = "group";
    for (const [label, delta] of [["前へ", 1], ["後ろへ", -1]] as const) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.textContent = label;
      btn.title = "重なったとき、前に出す・後ろに回す";
      btn.addEventListener("click", () => store.reorder(item.id, delta));
      order.append(btn);
    }
    host.append(order, del);
  }

  return { render };
}
