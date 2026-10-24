import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { initSync, requiredMeasurements, solve } from "../vendor/shinbun_layout_wasm.js";
import { minimalLines, toProblem } from "../src/autolayout.ts";
import type { Measured, Query, Solution } from "../src/autolayout.ts";
import { overlappingIds } from "../src/grid.ts";
import { sampleState } from "../src/sample.ts";

initSync({ module: readFileSync(new URL("../vendor/shinbun_layout_wasm_bg.wasm", import.meta.url)) });

test("toProblem: 部品の種類を役割に、見出しの大きさを重要度に置き換える", () => {
  const s = sampleState("vertical");
  const p = toProblem(s, new Map([[s.items.find((it) => it.kind === "photo")!.id, 1]]));
  assert.deepEqual(p.paper, { writing: "vertical", dan: 10, lines: 50, chars: 10 });
  const byRole = (role: string) => p.items.filter((it) => it.role === role);
  assert.equal(byRole("article").find((it) => it.lead)?.priority, 10);
  assert.ok(byRole("article").filter((it) => !it.lead).every((it) => it.priority === 3 && it.headline === "s" && (it.chars ?? 0) > 0));
  assert.deepEqual(byRole("photo").map((it) => [it.ratio, it.caption]), [[1, true]]);
  assert.equal(byRole("nameplate")[0]?.priority, 10);
});

test("toProblem: 横組みは段の長さを渡す", () => {
  const p = toProblem(sampleState("horizontal"), new Map(), { column_em: 9.4, gap_em: 1 });
  assert.equal(p.paper.column_em, 9.4);
  assert.equal(p.paper.gap_em, 1);
});

test("minimalLines: 収まる最小の行数を二分探索で求め、収まらなければ null", async () => {
  const need: Record<string, number> = { a: 7, b: 99 };
  let rounds = 0;
  const table = await minimalLines([{ id: "a", span: 2 }, { id: "b", span: 1 }], 20, async (tries) => {
    rounds++;
    return tries.map((t) => t.w >= need[t.id]! - t.span);
  });
  assert.deepEqual(table, [
    { id: "a", span: 2, lines: 5 },
    { id: "b", span: 1, lines: null },
  ]);
  assert.ok(rounds <= 7, `${rounds}`);
});

function fakeTable(problemJson: string): Measured[] {
  const problem = JSON.parse(problemJson) as ReturnType<typeof toProblem>;
  const per = problem.paper.column_em ?? problem.paper.chars;
  return (JSON.parse(requiredMeasurements(problemJson)) as Query[]).map((q) => {
    const it = problem.items.find((i) => i.id === q.id)!;
    if (it.role === "article" || it.role === "box") return { ...q, lines: Math.ceil((it.chars ?? 0) / (q.span * per)) + 3 };
    if (it.role === "yoko") return { ...q, lines: q.span <= 2 ? 6 : 1 };
    return { ...q, lines: 1 };
  });
}

test("shinbun-layout: 見本を組むと、全部の部品が重ならずに置かれる", () => {
  for (const writing of ["vertical", "horizontal"] as const) {
    const state = sampleState(writing);
    const problem = JSON.stringify(toProblem(state, new Map(), writing === "horizontal" ? { column_em: 9.4, gap_em: 1 } : undefined));
    const solution = JSON.parse(solve(problem, JSON.stringify(fakeTable(problem)), "")) as Solution;
    assert.deepEqual(solution.unplaced, [], writing);
    assert.equal(solution.layout.placements.length, state.items.length, writing);
    assert.equal(overlappingIds(solution.layout.placements).size, 0, writing);
  }
});
