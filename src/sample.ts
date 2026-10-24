import { KAMIMEN_ICON } from "./sample-image.ts";
import { createState, makeItem } from "./state.ts";
import type { State, Writing } from "./types.ts";

const intro = [
  "kamimen（紙面）は、日本の新聞の紙面をウェブで組むための道具をまとめた組織だ。縦組みと横組み、段組み、段抜きの見出しを、HTML と CSS で書けるようにする。",
  "土台になる CSS の上に、タグだけで組む部品、紙面を自動で組むライブラリ、ブログのテーマ、この紙面メーカーが並ぶ。どれも MIT ライセンスで公開している。",
  "この紙面も、紙面メーカーで組んだ。部品はドラッグで動かせて、右のパネルで文章を直せる。",
].join("\n\n");

const repos = {
  css: {
    kicker: "shinbun-css",
    headline: "土台の CSS",
    body: "新聞の紙面を組むための CSS。縦組みと横組み、段組み、段抜きの見出し、題字、広告枠、表を、HTML と CSS だけで書ける。依存するライブラリはない。",
  },
  components: {
    kicker: "shinbun-components",
    headline: "タグだけで組む",
    body: "HTML のタグを並べるだけで、段組みの紙面になる部品。ウェブ標準の仕組みで作っていて、実行時の依存はない。",
  },
  layout: {
    kicker: "shinbun-layout",
    headline: "紙面を自動で組む",
    body: "記事と写真と囲みを渡すと、段組みのどこに置くかを返すライブラリ。Rust で書かれ、ブラウザやコマンドからも使える。配置の問題も知らせる。",
  },
  astro: {
    kicker: "astro-theme-shinbun",
    headline: "紙面のブログ",
    body: "新聞の紙面のように読める、日本語のブログのテーマ。ふだんは横組みで、記事ごとに縦組みにもできる。",
  },
  maker: {
    kicker: "shinbun-maker",
    headline: "紙面メーカー",
    body: "文章と画像から紙面を作り、PNG や PDF で保存するアプリ。文章や画像は、ブラウザの中だけで扱う。",
  },
};

const nameplate = { title: "かみめん新聞", meta: "github.com/kamimen" };
const lead = { kicker: "kamimen", headline: "紙面を組む道具、五つ", headlineSize: "l" as const, body: intro, isLead: true };
const photo = { image: KAMIMEN_ICON, caption: "kamimen のアイコン" };
const box = { title: "今日のことば", body: "段組み　紙面を、いくつかの段に区切って組むこと。新聞では、縦組みの段は上から下へ並ぶ。" };
const ad = { label: "github.com/kamimen" };

function vertical(): State {
  const s = createState("vertical");
  const small = { headlineSize: "s" as const };
  s.items = [
    makeItem("nameplate", { x: 1, w: 8, y: 1, span: 3 }, nameplate),
    makeItem("yoko", { x: 9, w: 30, y: 1, span: 2 }, { text: "新聞の紙面を、ウェブで組む", size: 2 }),
    makeItem("article", { x: 9, w: 20, y: 3, span: 5 }, lead),
    makeItem("photo", { x: 29, w: 10, y: 3, span: 3 }, photo),
    makeItem("article", { x: 29, w: 10, y: 6, span: 2 }, { ...repos.maker, ...small }),
    makeItem("box", { x: 39, w: 12, y: 1, span: 3 }, box),
    makeItem("article", { x: 1, w: 8, y: 4, span: 4 }, { ...repos.css, ...small }),
    makeItem("article", { x: 39, w: 12, y: 4, span: 4 }, { ...repos.components, ...small }),
    makeItem("article", { x: 1, w: 12, y: 8, span: 3 }, { ...repos.layout, ...small }),
    makeItem("article", { x: 13, w: 12, y: 8, span: 3 }, { ...repos.astro, ...small }),
    makeItem("ad", { x: 25, w: 26, y: 8, span: 3 }, ad),
  ];
  return s;
}

function horizontal(): State {
  const s = createState("horizontal");
  const small = { headlineSize: "s" as const };
  s.items = [
    makeItem("nameplate", { x: 1, w: 4, y: 1, span: 6 }, nameplate),
    makeItem("article", { x: 5, w: 14, y: 1, span: 4 }, lead),
    makeItem("photo", { x: 19, w: 9, y: 1, span: 2 }, photo),
    makeItem("box", { x: 19, w: 9, y: 3, span: 2 }, box),
    makeItem("article", { x: 5, w: 11, y: 5, span: 2 }, { ...repos.css, ...small }),
    makeItem("article", { x: 16, w: 12, y: 5, span: 2 }, { ...repos.components, ...small }),
    makeItem("article", { x: 28, w: 9, y: 1, span: 2 }, { ...repos.layout, ...small }),
    makeItem("article", { x: 28, w: 9, y: 3, span: 2 }, { ...repos.astro, ...small }),
    makeItem("article", { x: 28, w: 9, y: 5, span: 2 }, { ...repos.maker, ...small }),
    makeItem("ad", { x: 37, w: 4, y: 1, span: 6 }, ad),
  ];
  return s;
}

export function sampleState(writing: Writing): State {
  return writing === "horizontal" ? horizontal() : vertical();
}
