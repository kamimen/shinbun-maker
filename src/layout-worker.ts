import init, { requiredMeasurements, solve } from "../vendor/shinbun_layout_wasm.js";

export type LayoutRequest =
  | { id: number; type: "measurements"; problem: string }
  | { id: number; type: "solve"; problem: string; table: string };

export type LayoutResponse = { id: number; result: string } | { id: number; error: string };

const ready = init();

self.addEventListener("message", async (e: MessageEvent<LayoutRequest>) => {
  const req = e.data;
  try {
    await ready;
    const result = req.type === "measurements" ? requiredMeasurements(req.problem) : solve(req.problem, req.table, "");
    self.postMessage({ id: req.id, result } satisfies LayoutResponse);
  } catch (err) {
    self.postMessage({ id: req.id, error: String(err) } satisfies LayoutResponse);
  }
});
