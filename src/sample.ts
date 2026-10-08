import { createState, makeItem } from "./state.ts";
import type { State, Writing } from "./types.ts";

const lorem = [
  "みどり市は七日、旧運河沿いの煉瓦倉庫を改修し、市民が自由に本を読み、書き物ができる「市民の書斎」を来年春に開くと発表した。",
  "倉庫は一九二〇年代に建てられ、かつては川舟で運ばれた穀物を保管していた。市は老朽化を理由に解体を検討していたが、住民団体が保存を求める署名を2万筆集め、方針を転換した。",
  "改修後は一階を閲覧室、二階を個人用の執筆席とする。蔵書は寄贈と購入を合わせて3万冊を目指し、開館時間は午前九時から午後十時までとした。",
].join("\n\n");

function vertical(): State {
  const s = createState("vertical");
  s.items = [
    makeItem("nameplate", { x: 1, w: 8, y: 1, span: 3 }),
    makeItem("yoko", { x: 9, w: 26, y: 1, span: 2 }, { text: "川のまちに「市民の書斎」", size: 2 }),
    makeItem("article", { x: 9, w: 17, y: 3, span: 5 }, { kicker: "みどり市", headline: "旧運河沿いに市民の書斎", headlineSize: "l", dateline: "みどり市＝架空太郎", body: lorem, isLead: true }),
    makeItem("photo", { x: 26, w: 9, y: 3, span: 3 }, { caption: "改修される煉瓦倉庫" }),
    makeItem("article", { x: 26, w: 9, y: 6, span: 2 }, { headline: "図書館とどう違う", headlineSize: "s", body: "貸し出しはせず、館内での閲覧と執筆に特化する。" }),
    makeItem("box", { x: 35, w: 8, y: 1, span: 3 }, { title: "今日のことば", body: "書斎　本を読み、書き物をするための静かな部屋。" }),
    makeItem("article", { x: 35, w: 8, y: 4, span: 4 }, { headline: "見守り隊、十周年", headlineSize: "s", body: "あおば区の見守り隊が十周年を迎えた。隊員は80人を超える。" }),
    makeItem("ad", { x: 1, w: 42, y: 8, span: 3 }),
  ];
  return s;
}

function horizontal(): State {
  const s = createState("horizontal");
  s.items = [
    makeItem("nameplate", { x: 1, w: 4, y: 1, span: 6 }, { meta: "" }),
    makeItem("article", { x: 5, w: 14, y: 1, span: 4 }, { kicker: "みどり市", headline: "旧運河沿いに市民の書斎", headlineSize: "l", dateline: "みどり市＝架空太郎", body: lorem, isLead: true }),
    makeItem("photo", { x: 5, w: 8, y: 5, span: 2 }, { caption: "改修される煉瓦倉庫" }),
    makeItem("box", { x: 13, w: 6, y: 5, span: 2 }, { title: "今日のことば", body: "書斎　本を読み、書き物をするための静かな部屋。" }),
    makeItem("article", { x: 19, w: 10, y: 1, span: 3 }, { headline: "図書館とどう違う", headlineSize: "s", body: "貸し出しはせず、館内での閲覧と執筆に特化する。" }),
    makeItem("article", { x: 19, w: 10, y: 4, span: 3 }, { headline: "見守り隊、十周年", headlineSize: "s", body: "あおば区の見守り隊が十周年を迎えた。隊員は80人を超える。" }),
    makeItem("ad", { x: 30, w: 6, y: 1, span: 6 }),
  ];
  return s;
}

export function sampleState(writing: Writing): State {
  return writing === "horizontal" ? horizontal() : vertical();
}
