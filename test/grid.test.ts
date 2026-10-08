import test from "node:test";
import assert from "node:assert/strict";
import { axesOf, trackStarts, indexAt, offsetOnAxis, overlaps, clampRect, findFreeRect, overlappingIds, resizeRect, nudge } from "../src/grid.ts";

test("縦組みは段が上から下、行が右から左", () => {
  const a = axesOf("vertical");
  assert.deepEqual(a.dan, { axis: "y", reverse: false });
  assert.deepEqual(a.line, { axis: "x", reverse: true });
});

test("横組みは段が左から右、行が上から下", () => {
  const a = axesOf("horizontal");
  assert.deepEqual(a.dan, { axis: "x", reverse: false });
  assert.deepEqual(a.line, { axis: "y", reverse: false });
});

test("trackStarts: 余白と間隔を含めた開始位置", () => {
  assert.deepEqual(trackStarts([10, 10, 10], 2, 1), [1, 13, 25]);
});

test("indexAt: 番号は 1 から。範囲外は端に丸める", () => {
  const sizes = [10, 10, 10];
  assert.equal(indexAt(sizes, 2, 0, 5), 1);
  assert.equal(indexAt(sizes, 2, 0, 15), 2);
  assert.equal(indexAt(sizes, 2, 0, 29), 3);
  assert.equal(indexAt(sizes, 2, 0, -50), 1);
  assert.equal(indexAt(sizes, 2, 0, 999), 3);
});

test("indexAt: 間隔の中央で番号が切り替わる", () => {
  assert.equal(indexAt([10, 10], 2, 0, 10.9), 1);
  assert.equal(indexAt([10, 10], 2, 0, 11), 2);
});

test("offsetOnAxis: 縦組みの行軸は右端から、段軸は上端から", () => {
  const box = { left: 100, right: 500, top: 50, bottom: 450 };
  const { line, dan } = axesOf("vertical");
  assert.equal(offsetOnAxis(line, box, { x: 450, y: 0 }), 50);
  assert.equal(offsetOnAxis(dan, box, { x: 0, y: 150 }), 100);
});

test("offsetOnAxis: 横組みの段軸は左端から、行軸は上端から", () => {
  const box = { left: 100, right: 500, top: 50, bottom: 450 };
  const { line, dan } = axesOf("horizontal");
  assert.equal(offsetOnAxis(dan, box, { x: 160, y: 0 }), 60);
  assert.equal(offsetOnAxis(line, box, { x: 0, y: 70 }), 20);
});

test("overlaps: 接しているだけなら重ならない", () => {
  assert.equal(overlaps({ x: 1, w: 3, y: 1, span: 2 }, { x: 4, w: 3, y: 1, span: 2 }), false);
  assert.equal(overlaps({ x: 1, w: 3, y: 1, span: 2 }, { x: 3, w: 3, y: 2, span: 2 }), true);
});

test("clampRect: 紙面に収め、大きさは 1 以上にする", () => {
  const size = { dan: 10, lines: 50 };
  assert.deepEqual(clampRect({ x: 48, w: 10, y: 9, span: 5 }, size), { x: 41, w: 10, y: 6, span: 5 });
  assert.deepEqual(clampRect({ x: 0, w: 0, y: -3, span: 0 }, size), { x: 1, w: 1, y: 1, span: 1 });
  assert.deepEqual(clampRect({ x: 1, w: 999, y: 1, span: 999 }, size), { x: 1, w: 50, y: 1, span: 10 });
});

test("findFreeRect: 段の上、行の始点から順に空きを探す", () => {
  const size = { dan: 4, lines: 10 };
  assert.deepEqual(findFreeRect([{ x: 1, w: 5, y: 1, span: 4 }], size, 5, 2), { x: 6, y: 1, w: 5, span: 2 });
});

test("findFreeRect: 空きがなければ (1, 1)", () => {
  const size = { dan: 2, lines: 4 };
  assert.deepEqual(findFreeRect([{ x: 1, w: 4, y: 1, span: 2 }], size, 2, 1), { x: 1, y: 1, w: 2, span: 1 });
});

test("overlappingIds: 重なっている部品だけ", () => {
  const items = [
    { id: "a", x: 1, w: 3, y: 1, span: 2 },
    { id: "b", x: 3, w: 3, y: 1, span: 2 },
    { id: "c", x: 10, w: 3, y: 1, span: 2 },
  ];
  assert.deepEqual([...overlappingIds(items)].sort(), ["a", "b"]);
});

test("resizeRect: 終端の角は、段数と行数を変える", () => {
  const r = { x: 5, w: 4, y: 3, span: 2 };
  assert.deepEqual(resizeRect(r, { dan: "end", line: "end" }, { dan: 6, line: 10 }), { x: 5, w: 6, y: 3, span: 4 });
});

test("resizeRect: 始端の角は、開始位置を動かし、反対側の端は動かさない", () => {
  const r = { x: 5, w: 4, y: 3, span: 2 };
  assert.deepEqual(resizeRect(r, { dan: "start", line: "start" }, { dan: 1, line: 2 }), { x: 2, w: 7, y: 1, span: 4 });
});

test("resizeRect: 反対側の端を越えても、大きさは 1 以上", () => {
  const r = { x: 5, w: 4, y: 3, span: 2 };
  assert.deepEqual(resizeRect(r, { dan: "end", line: "end" }, { dan: 1, line: 1 }), { x: 5, w: 1, y: 3, span: 1 });
  assert.deepEqual(resizeRect(r, { dan: "start", line: "start" }, { dan: 9, line: 20 }), { x: 8, w: 1, y: 4, span: 1 });
});

test("nudge: 縦組みは、左が行の増える向き、下が段の増える向き", () => {
  const r = { x: 5, w: 4, y: 3, span: 2 };
  assert.deepEqual(nudge(r, "ArrowLeft", "vertical", false), { x: 6, w: 4, y: 3, span: 2 });
  assert.deepEqual(nudge(r, "ArrowDown", "vertical", false), { x: 5, w: 4, y: 4, span: 2 });
});

test("nudge: 横組みは、右が段の増える向き、下が行の増える向き", () => {
  const r = { x: 5, w: 4, y: 3, span: 2 };
  assert.deepEqual(nudge(r, "ArrowRight", "horizontal", false), { x: 5, w: 4, y: 4, span: 2 });
  assert.deepEqual(nudge(r, "ArrowDown", "horizontal", false), { x: 6, w: 4, y: 3, span: 2 });
});

test("nudge: Shift 付きは、大きさを変える。矢印以外は null", () => {
  const r = { x: 5, w: 4, y: 3, span: 2 };
  assert.deepEqual(nudge(r, "ArrowDown", "vertical", true), { x: 5, w: 4, y: 3, span: 3 });
  assert.equal(nudge(r, "a", "vertical", false), null);
});
