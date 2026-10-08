import test from "node:test";
import assert from "node:assert/strict";
import { createState, normalizeState, normalizePaper, makeItem, History, switchWriting, KINDS, PAPER_DEFAULTS } from "../src/state.ts";

const r = { x: 1, w: 1, y: 1, span: 1 };

test("createState: 組方向ごとの初期値", () => {
  assert.equal(createState("vertical").paper.dan, PAPER_DEFAULTS.vertical.dan);
  assert.equal(createState("horizontal").paper.writing, "horizontal");
});

test("normalizePaper: 段は 15、行は 60 までに収める", () => {
  const p = normalizePaper({ writing: "vertical", dan: 99, lines: 999, chars: 1, fs: Number.NaN });
  assert.equal(p.dan, 15);
  assert.equal(p.lines, 60);
  assert.equal(p.chars, 4);
  assert.equal(p.fs, PAPER_DEFAULTS.vertical.fs);
});

test("normalizePaper: 不明な組方向は縦組み", () => {
  assert.equal(normalizePaper({ writing: "diagonal" as never }).writing, "vertical");
});

test("makeItem: 種類ごとの初期の中身を持つ", () => {
  const item = makeItem("article", { x: 1, w: 5, y: 1, span: 3 });
  assert.equal(item.kind, "article");
  assert.equal(item.headlineSize, KINDS.article.fields.headlineSize);
});

test("makeItem: 初期の中身は部品どうしで共有しない", () => {
  const a = makeItem("box", r);
  a.title = "変えた";
  assert.notEqual(makeItem("box", r).title, "変えた");
});

test("normalizeState: 壊れた部品を捨て、座標を紙面に収める", () => {
  const s = normalizeState({
    paper: { writing: "vertical", dan: 10, lines: 50 },
    items: [
      { id: "ok", kind: "box", x: 49, w: 10, y: 1, span: 3, title: "t", body: "b" },
      { id: "bad", kind: "unknown" },
      null,
      { id: "wrongtype", kind: "box", x: 1, w: 1, y: 1, span: 1, title: 123 },
    ],
  });
  assert.equal(s.items.length, 2);
  assert.equal(s.items[0]?.x, 41);
  assert.equal(s.items[0]?.kind === "box" && s.items[0].title, "t");
  assert.equal(s.items[1]?.kind === "box" && s.items[1].title, KINDS.box.fields.title);
});

test("normalizeState: 空や不正な入力でも状態になる", () => {
  assert.deepEqual(normalizeState(null).items, []);
  assert.equal(normalizeState({ items: "x" }).items.length, 0);
});

test("History: 元に戻す、やり直す", () => {
  const h = new History();
  const s0 = createState();
  h.push(s0);
  const s1 = { ...s0, paper: { ...s0.paper, dan: 5 } };
  const back = h.undo(s1);
  assert.equal(back?.paper.dan, s0.paper.dan);
  assert.equal(h.redo(back!)?.paper.dan, 5);
  assert.equal(new History().undo(createState()), null);
});

test("History: 新しい変更で、やり直しの履歴は消える", () => {
  const h = new History();
  h.push(createState());
  h.undo(createState());
  assert.equal(h.future.length, 1);
  h.push(createState());
  assert.equal(h.future.length, 0);
});

test("switchWriting: 紙面の設定が初期値になり、部品は収め直される", () => {
  const s = createState("vertical");
  s.items.push(makeItem("box", { x: 45, w: 5, y: 8, span: 3 }));
  const h = switchWriting(s, "horizontal");
  const it = h.items[0]!;
  assert.equal(h.paper.writing, "horizontal");
  assert.ok(it.x + it.w - 1 <= h.paper.lines);
  assert.ok(it.y + it.span - 1 <= h.paper.dan);
});
