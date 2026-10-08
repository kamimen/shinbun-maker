import "../vendor/shinbun.min.css";
import "./paper.css";
import "./app.css";
import { PAGE_SIZES, downloadPng, printPdf } from "./export.ts";
import { createPanel } from "./panel.ts";
import { sampleState } from "./sample.ts";
import { KINDS, KIND_LIST, createState, itemTitle } from "./state.ts";
import { clampRect, nudge } from "./grid.ts";
import { createStage } from "./stage.ts";
import type { Status } from "./stage.ts";
import { exportJson, importJson, loadState, saveState } from "./storage.ts";
import { Store } from "./store.ts";
import type { State } from "./types.ts";

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;

let toastTimer = 0;
function notify(text: string): void {
  document.querySelector(".toast")?.remove();
  const toast = document.createElement("div");
  toast.className = "toast";
  toast.setAttribute("role", "status");
  toast.textContent = text;
  document.body.append(toast);
  clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => toast.remove(), 6000);
}

const initial = (await loadState()) ?? sampleState("vertical");
const store = new Store(initial);
const stage = createStage($("stage"), store, showStatus);
const panel = createPanel($("panel"), store);

function showStatus({ overlap, overflow }: Status): void {
  const parts = [`部品 ${store.state.items.length} 個`];
  if (overlap.size) parts.push(`重なり ${overlap.size} 個`);
  if (overflow.size) parts.push(`はみ出し ${overflow.size} 個`);
  $("status").textContent = parts.join("　");
  $("status").classList.toggle("warn", overlap.size + overflow.size > 0);
  renderParts(overlap, overflow);
}

function renderParts(overlap: Set<string>, overflow: Set<string>): void {
  const list = $("parts");
  list.replaceChildren();
  for (const it of [...store.state.items].reverse()) {
    const b = document.createElement("button");
    b.type = "button";
    b.textContent = itemTitle(it);
    b.title = b.textContent;
    if (it.id === store.selectedId) b.setAttribute("aria-current", "true");
    if (overflow.has(it.id)) b.classList.add("is-overflow");
    else if (overlap.has(it.id)) b.classList.add("is-overlap");
    b.addEventListener("click", () => {
      store.select(it.id);
      stage.reveal(it.id);
    });
    list.append(b);
  }
}

for (const kind of KIND_LIST) {
  const b = document.createElement("button");
  b.type = "button";
  b.textContent = `＋ ${KINDS[kind].label}`;
  b.addEventListener("click", () => store.add(kind));
  $("tools").append(b);
}

for (const [key, def] of Object.entries(PAGE_SIZES)) $("page-size").append(new Option(`PDF ${def.label}`, key));

let saveTimer = 0;
store.subscribe((reason) => {
  void stage.render().then(() => {
    if (reason === "add" && store.selectedId) stage.reveal(store.selectedId);
  });
  if (reason !== "panel") panel.render();
  ($("undo") as HTMLButtonElement).disabled = store.history.past.length === 0;
  ($("redo") as HTMLButtonElement).disabled = store.history.future.length === 0;
  clearTimeout(saveTimer);
  saveTimer = window.setTimeout(() => void saveState(store.state), 500);
});

const menu = $<HTMLDetailsElement>("file-menu");
const click = (id: string, fn: () => void) =>
  $(id).addEventListener("click", () => {
    menu.open = false;
    fn();
  });
const replaceWith = (next: State) => {
  const hadItems = store.state.items.length > 0;
  store.replace(next);
  if (hadItems) notify("紙面を置き換えました。「元に戻す」で、前の紙面に戻せます");
};
click("new-v", () => replaceWith(createState("vertical")));
click("new-h", () => replaceWith(createState("horizontal")));
click("sample-v", () => replaceWith(sampleState("vertical")));
click("sample-h", () => replaceWith(sampleState("horizontal")));
document.addEventListener("click", (e) => {
  if (!menu.contains(e.target as Node)) menu.open = false;
});
click("undo", () => store.undo());
click("redo", () => store.redo());
click("save-json", () => exportJson(store.state));
click("load-json", () => $("json-file").click());
$("json-file").addEventListener("change", async (e) => {
  const input = e.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file) return;
  try {
    replaceWith(await importJson(file));
  } catch {
    alert("JSON を読み込めませんでした");
  }
  input.value = "";
});
$("grid").addEventListener("change", (e) => stage.setGrid((e.target as HTMLInputElement).checked));
$("zoom").addEventListener("change", (e) => {
  const v = (e.target as HTMLSelectElement).value;
  stage.setZoom(v === "fit" ? "fit" : Number(v));
});
addEventListener("resize", () => {
  if (($("zoom") as HTMLSelectElement).value === "fit") stage.setZoom("fit");
});
$("stage").addEventListener("dblclick", (e) => {
  if (!(e.target as Element).closest("[data-id]")) return;
  const field = $("panel").querySelector<HTMLInputElement | HTMLTextAreaElement>("textarea, input[type=text]");
  field?.focus();
  field?.select();
});

click("png", async () => {
  const paper = stage.getPaper();
  if (!paper) return;
  try {
    await downloadPng(paper, Number(($("png-scale") as HTMLSelectElement).value));
  } catch (err) {
    alert(err instanceof Error ? err.message : "PNG を作れませんでした");
  }
});
click("pdf", () => {
  const paper = stage.getPaper();
  if (!paper) return;
  notify("印刷の画面が開きます。送信先を「PDF に保存」にしてください");
  printPdf(paper, ($("page-size") as HTMLSelectElement).value);
});

addEventListener("keydown", (e) => {
  const target = e.target instanceof Element ? e.target : document.body;
  const mod = e.metaKey || e.ctrlKey;
  if (target.closest("input, textarea, select")) return;
  const item = store.selected;
  if (mod && e.key.toLowerCase() === "z") {
    e.preventDefault();
    if (e.shiftKey) store.redo();
    else store.undo();
  } else if ((e.key === "Delete" || e.key === "Backspace") && item) {
    e.preventDefault();
    store.remove(item.id);
  } else if (e.key === "Escape" && item) {
    store.select(null);
  } else if (item && !mod) {
    const next = nudge(item, e.key, store.state.paper.writing, e.shiftKey);
    if (!next) return;
    e.preventDefault();
    store.update(item.id, clampRect(next, store.state.paper), "other");
  }
});

void stage.render();
panel.render();
($("undo") as HTMLButtonElement).disabled = true;
($("redo") as HTMLButtonElement).disabled = true;
