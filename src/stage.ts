import { autoTcy, findOverflow } from "../vendor/shinbun.js";
import { axesOf, clampRect, indexAt, offsetOnAxis, overlappingIds, resizeRect, trackStarts } from "./grid.ts";
import type { Box, Corner, Edge } from "./grid.ts";
import { readImage } from "./image.ts";
import { buildPaper } from "./render.ts";
import type { Store } from "./store.ts";
import type { Rect } from "./types.ts";

interface Metrics {
  box: Box;
  danSizes: number[];
  lineSizes: number[];
  danGap: number;
  lineGap: number;
}

export interface Status {
  overlap: Set<string>;
  overflow: Set<string>;
}

function px(v: string): number {
  return Number.parseFloat(v) || 0;
}

function measure(page: HTMLElement, host: HTMLElement, scale: number): Metrics {
  const cs = getComputedStyle(page);
  const r = page.getBoundingClientRect();
  const h = host.getBoundingClientRect();
  const box = {
    left: (r.left - h.left) / scale + px(cs.paddingLeft) + px(cs.borderLeftWidth),
    right: (r.right - h.left) / scale - px(cs.paddingRight) - px(cs.borderRightWidth),
    top: (r.top - h.top) / scale + px(cs.paddingTop) + px(cs.borderTopWidth),
    bottom: (r.bottom - h.top) / scale - px(cs.paddingBottom) - px(cs.borderBottomWidth),
  };
  return {
    box,
    danSizes: cs.gridTemplateColumns.split(" ").map(px),
    lineSizes: cs.gridTemplateRows.split(" ").map(px),
    danGap: px(cs.columnGap),
    lineGap: px(cs.rowGap),
  };
}

function div(className: string, left: number, top: number, width: number, height: number): HTMLElement {
  const node = document.createElement("div");
  node.className = className;
  node.style.cssText = `left:${left}px;top:${top}px;width:${width}px;height:${height}px`;
  return node;
}

export type Zoom = number | "fit";

export function createStage(host: HTMLElement, store: Store, onStatus: (s: Status) => void) {
  const box = host.parentElement as HTMLElement;
  const wrap = box.parentElement as HTMLElement;
  let showGrid = true;
  let zoom: Zoom = 1;
  let scale = 1;
  let paperEl: HTMLElement | null = null;
  let metrics: Metrics | null = null;
  let lastWriting: string | null = null;
  let drag: { mode: "move" | "resize"; corner?: Corner; id: string; start: { dan: number; line: number }; rect: Rect; moved: boolean } | null = null;

  function applyScale(): void {
    host.style.transform = "";
    const w = host.offsetWidth;
    const h = host.offsetHeight;
    scale = zoom === "fit" ? Math.min(1, (wrap.clientWidth - 48) / w, (wrap.clientHeight - 48) / h) : zoom;
    host.style.transformOrigin = "top left";
    host.style.transform = scale === 1 ? "" : `scale(${scale})`;
    box.style.width = `${w * scale}px`;
    box.style.height = `${h * scale}px`;
  }

  function localPoint(e: PointerEvent): { x: number; y: number } {
    const h = host.getBoundingClientRect();
    return { x: (e.clientX - h.left) / scale, y: (e.clientY - h.top) / scale };
  }

  function cellAt(e: PointerEvent): { dan: number; line: number } | null {
    if (!metrics) return null;
    const axes = axesOf(store.state.paper.writing);
    const point = localPoint(e);
    return {
      dan: indexAt(metrics.danSizes, metrics.danGap, 0, offsetOnAxis(axes.dan, metrics.box, point)),
      line: indexAt(metrics.lineSizes, metrics.lineGap, 0, offsetOnAxis(axes.line, metrics.box, point)),
    };
  }

  function drawGrid(overlay: HTMLElement): void {
    if (!metrics) return;
    const { box: b, danSizes, lineSizes, danGap, lineGap } = metrics;
    const vertical = store.state.paper.writing === "vertical";
    const width = b.right - b.left;
    const height = b.bottom - b.top;
    const dan = trackStarts(danSizes, danGap);
    const line = trackStarts(lineSizes, lineGap);
    if (vertical) {
      for (const s of dan) overlay.append(div("grid-line", b.left, b.top + s, width, 1));
      lineSizes.forEach((size, i) => overlay.append(div("grid-line", b.right - (line[i] ?? 0) - size, b.top, 1, height)));
    } else {
      for (const s of dan) overlay.append(div("grid-line", b.left + s, b.top, 1, height));
      for (const s of line) overlay.append(div("grid-line", b.left, b.top + s, width, 1));
    }
  }

  function frameOf(el: Element, className: string): HTMLElement {
    const r = el.getBoundingClientRect();
    const h = host.getBoundingClientRect();
    return div(className, (r.left - h.left) / scale, (r.top - h.top) / scale, r.width / scale, r.height / scale);
  }

  function itemEl(id: string): Element | null {
    return paperEl?.querySelector(`[data-id="${id}"]`) ?? null;
  }

  function drawOverlay(overflowIds: Set<string>): void {
    host.querySelector(".overlay")?.remove();
    const overlay = document.createElement("div");
    overlay.className = "overlay";
    if (showGrid) drawGrid(overlay);

    const overlap = overlappingIds(store.state.items);
    for (const it of store.state.items) {
      const el = itemEl(it.id);
      if (!el) continue;
      if (overlap.has(it.id)) overlay.append(frameOf(el, "frame is-overlap"));
      if (overflowIds.has(it.id)) overlay.append(frameOf(el, "frame is-overflow"));
    }

    const sel = store.selected;
    const selEl = sel && itemEl(sel.id);
    if (selEl) {
      overlay.append(frameOf(selEl, "frame is-selected"));
      const r = selEl.getBoundingClientRect();
      const h = host.getBoundingClientRect();
      const vertical = store.state.paper.writing === "vertical";
      const left = (r.left - h.left) / scale;
      const right = (r.right - h.left) / scale;
      const top = (r.top - h.top) / scale;
      const bottom = (r.bottom - h.top) / scale;
      for (const dan of ["start", "end"] as Edge[]) {
        for (const line of ["start", "end"] as Edge[]) {
          const x = vertical ? (line === "start" ? right : left) : dan === "start" ? left : right;
          const y = vertical ? (dan === "start" ? top : bottom) : line === "start" ? top : bottom;
          const handle = div("handle", x - 12 / scale, y - 12 / scale, 24 / scale, 24 / scale);
          handle.dataset.dan = dan;
          handle.dataset.line = line;
          const diagonal = (x === left) === (y === top);
          handle.style.cursor = diagonal ? "nwse-resize" : "nesw-resize";
          overlay.append(handle);
        }
      }
    }
    if (store.state.items.length === 0) {
      const hint = document.createElement("p");
      hint.className = "empty-hint";
      hint.textContent = "左の「＋」から、部品を置きます";
      overlay.append(hint);
    }
    host.append(overlay);
    onStatus({ overlap, overflow: overflowIds });
  }

  async function render(): Promise<void> {
    const scroll = { left: wrap.scrollLeft, top: wrap.scrollTop };
    paperEl = buildPaper(store.state);
    host.replaceChildren(paperEl);
    if (store.state.paper.writing === "vertical") autoTcy(paperEl);
    const selected = store.selectedId && itemEl(store.selectedId);
    if (selected) selected.setAttribute("data-selected", "");
    applyScale();
    const switched = lastWriting !== store.state.paper.writing;
    wrap.scrollLeft = switched && store.state.paper.writing === "vertical" ? wrap.scrollWidth : scroll.left;
    wrap.scrollTop = scroll.top;
    lastWriting = store.state.paper.writing;

    const page = paperEl.querySelector<HTMLElement>(".sb-page")!;
    metrics = measure(page, host, scale);
    const ids = (els: Element[]) => new Set(els.map((e) => (e as HTMLElement).dataset.id ?? ""));
    drawOverlay(ids(findOverflow(page)));
    await document.fonts.ready;
    if (paperEl && host.contains(paperEl)) {
      applyScale();
      metrics = measure(page, host, scale);
      drawOverlay(ids(findOverflow(page)));
    }
  }

  host.addEventListener("pointerdown", (e) => {
    const target = e.target as Element;
    const onHandle = target.closest<HTMLElement>(".handle");
    const itemNode = target.closest<HTMLElement>("[data-id]");
    const id = onHandle ? store.selectedId : itemNode?.dataset.id;
    if (!id) {
      store.select(null);
      return;
    }
    const item = store.state.items.find((it) => it.id === id);
    const start = cellAt(e);
    if (!item || !start) return;
    store.select(id);
    drag = { mode: onHandle ? "resize" : "move", corner: onHandle ? { dan: onHandle.dataset.dan as Edge, line: onHandle.dataset.line as Edge } : undefined, id, start, rect: { x: item.x, w: item.w, y: item.y, span: item.span }, moved: false };
    host.setPointerCapture(e.pointerId);
    e.preventDefault();
  });

  host.addEventListener("pointermove", (e) => {
    if (!drag) return;
    const cell = cellAt(e);
    if (!cell) return;
    const { rect, start } = drag;
    const next =
      drag.mode === "move"
        ? { x: rect.x + cell.line - start.line, y: rect.y + cell.dan - start.dan, w: rect.w, span: rect.span }
        : resizeRect(rect, drag.corner ?? { dan: "end", line: "end" }, cell);
    const fit = clampRect(next, store.state.paper);
    const cur = store.selected;
    if (!cur || (cur.x === fit.x && cur.y === fit.y && cur.w === fit.w && cur.span === fit.span)) return;
    store.update(drag.id, fit, "drag", !drag.moved);
    drag.moved = true;
  });

  host.addEventListener("dragover", (e) => {
    if (e.dataTransfer?.types.includes("Files")) e.preventDefault();
  });

  host.addEventListener("drop", async (e) => {
    const file = [...(e.dataTransfer?.files ?? [])].find((f) => f.type.startsWith("image/"));
    if (!file) return;
    e.preventDefault();
    const target = (e.target as Element).closest<HTMLElement>("[data-id]");
    const image = await readImage(file).catch(() => null);
    if (!image) return;
    const item = store.state.items.find((it) => it.id === target?.dataset.id);
    if (item?.kind === "photo") {
      store.update(item.id, { image }, "other");
      return;
    }
    const cell = cellAt(e as unknown as PointerEvent);
    store.add("photo", { image }, cell ? { x: cell.line, y: cell.dan } : undefined);
  });

  const end = () => {
    drag = null;
  };
  host.addEventListener("pointerup", end);
  host.addEventListener("pointercancel", end);

  return {
    render,
    getPaper: () => paperEl,
    setGrid(on: boolean) {
      showGrid = on;
      void render();
    },
    setZoom(z: Zoom) {
      zoom = z;
      void render();
    },
    reveal(id: string) {
      itemEl(id)?.scrollIntoView({ block: "nearest", inline: "nearest", behavior: "smooth" });
    },
  };
}

export type Stage = ReturnType<typeof createStage>;
