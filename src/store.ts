import { clampRect, findFreeRect, findNearestFreeRect } from "./grid.ts";
import { History, KINDS, makeItem, resizePaper, switchWriting } from "./state.ts";
import type { Item, Kind, Paper, Rect, State, Writing } from "./types.ts";

export type Reason = "panel" | "drag" | "add" | "relayout" | "fit" | "other";
type Listener = (reason: Reason) => void;

export class Store {
  state: State;
  selectedId: string | null = null;
  history = new History();
  private listeners = new Set<Listener>();

  constructor(state: State) {
    this.state = state;
  }

  subscribe(fn: Listener): void {
    this.listeners.add(fn);
  }

  private emit(reason: Reason): void {
    for (const fn of this.listeners) fn(reason);
  }

  get selected(): Item | undefined {
    return this.state.items.find((it) => it.id === this.selectedId);
  }

  replace(state: State): void {
    this.history.push(this.state);
    this.state = state;
    this.selectedId = null;
    this.emit("other");
  }

  select(id: string | null): void {
    if (this.selectedId === id) return;
    this.selectedId = id;
    this.emit("other");
  }

  add(kind: Kind, overrides: Partial<Item> = {}, at?: { x: number; y: number }): void {
    const { w, span } = KINDS[kind].size;
    const { items, paper } = this.state;
    const want = at ? clampRect({ ...at, w, span }, paper) : findFreeRect(items, paper, w, span);
    const rect = findNearestFreeRect(items, paper, want) ?? want;
    const item = makeItem(kind, rect, overrides as never) as Item;
    this.history.push(this.state);
    this.state = { ...this.state, items: [...this.state.items, item] };
    this.selectedId = item.id;
    this.emit("add");
  }

  remove(id: string): void {
    this.history.push(this.state);
    this.state = { ...this.state, items: this.state.items.filter((it) => it.id !== id) };
    if (this.selectedId === id) this.selectedId = null;
    this.emit("other");
  }

  update(id: string, patch: Partial<Item> | Rect, reason: Reason = "panel", record = true): void {
    if (record) this.history.push(this.state);
    this.state = {
      ...this.state,
      items: this.state.items.map((it) => (it.id === id ? ({ ...it, ...patch } as Item) : it)),
    };
    this.emit(reason);
  }

  fit(rects: Map<string, Rect>): void {
    this.state = { ...this.state, items: this.state.items.map((it) => ({ ...it, ...rects.get(it.id) }) as Item) };
    this.emit("fit");
  }

  reorder(id: string, delta: number): void {
    const items = [...this.state.items];
    const from = items.findIndex((it) => it.id === id);
    const to = Math.min(Math.max(from + delta, 0), items.length - 1);
    if (from < 0 || from === to) return;
    this.history.push(this.state);
    const [moved] = items.splice(from, 1);
    items.splice(to, 0, moved!);
    this.state = { ...this.state, items };
    this.emit("other");
  }

  setPaper(paper: Paper): void {
    this.history.push(this.state);
    this.state = resizePaper(this.state, paper);
    this.emit("relayout");
  }

  setWriting(writing: Writing): void {
    this.history.push(this.state);
    this.state = switchWriting(this.state, writing);
    this.emit("relayout");
  }

  undo(): void {
    const prev = this.history.undo(this.state);
    if (!prev) return;
    this.state = prev;
    if (!prev.items.some((it) => it.id === this.selectedId)) this.selectedId = null;
    this.emit("other");
  }

  redo(): void {
    const next = this.history.redo(this.state);
    if (!next) return;
    this.state = next;
    this.emit("other");
  }
}
