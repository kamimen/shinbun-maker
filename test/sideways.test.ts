import test from "node:test";
import assert from "node:assert/strict";
import { splitSideways } from "../src/sideways.ts";

const sideways = (text: string) => splitSideways(text).filter((p) => p.sideways).map((p) => p.text);

test("splitSideways: 小文字を含む欧文の語を回す", () => {
  assert.deepEqual(sideways("土台は shinbun.css。GitHub で公開"), ["shinbun.css", "GitHub"]);
});

test("splitSideways: 空白で続く語はひとまとまり", () => {
  assert.deepEqual(sideways("npm install @kamimen/shinbun-css"), ["npm install @kamimen/shinbun-css"]);
});

test("splitSideways: 大文字だけの略語と数字は回さない", () => {
  assert.deepEqual(sideways("HTML と CSS、MIT ライセンス、80 人"), []);
});

test("splitSideways: 分けた文字列をつなぐと元に戻る", () => {
  const text = "kamimen（紙面）は、Web Components と Rust で";
  assert.equal(splitSideways(text).map((p) => p.text).join(""), text);
});
