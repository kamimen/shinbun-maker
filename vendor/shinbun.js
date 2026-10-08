/*! shinbun.js v0.1.0 | MIT License | shinbun.css の任意の補助スクリプト（CSS だけでも使える） */

/**
 * 文字列を「縦中横にする部分」とそれ以外に分ける（DOM に依存しない純粋な関数）。
 *
 * 新聞では、2桁の数字だけを縦中横にし、それ以外の桁数の数字は縦に並べる。
 * CSS の `text-combine-upright: digits 2` がその指定だが、Chrome 154 でも未対応のため、
 * このスクリプトで代替する（MDN の互換性データでも `digits` は未掲載）。
 *
 * - 対象は半角の数字がちょうど2桁続く部分。
 * - 前後に数字がある場合（3桁以上）は対象外。
 * - 小数点・桁区切りでつながる数字（3.14、1,234）は対象外。
 *
 * @param {string} text
 * @returns {{ text: string, tcy: boolean }[]}
 */
export function splitTcy(text) {
  const re = /(?<![0-9]|[0-9][.,])([0-9]{2})(?![0-9]|[.,][0-9])/g;
  const out = [];
  let last = 0;
  for (const m of text.matchAll(re)) {
    if (m.index > last) out.push({ text: text.slice(last, m.index), tcy: false });
    out.push({ text: m[1], tcy: true });
    last = m.index + m[1].length;
  }
  if (last < text.length) out.push({ text: text.slice(last), tcy: false });
  return out;
}

const SKIP = "script,style,textarea,pre,code,.sb-tcy,[data-sb-no-tcy]";

/**
 * root 以下の本文で、2桁の数字を <span class="sb-tcy"> で包む。
 * 何度呼んでも二重には包まない。
 *
 * @param {ParentNode} [root]
 * @returns {number} 包んだ数
 */
export function autoTcy(root = document) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      if (!node.nodeValue || !/[0-9]{2}/.test(node.nodeValue)) return NodeFilter.FILTER_REJECT;
      return node.parentElement?.closest(SKIP) ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT;
    },
  });
  const targets = [];
  while (walker.nextNode()) targets.push(walker.currentNode);

  let count = 0;
  for (const node of targets) {
    const parts = splitTcy(node.nodeValue);
    if (!parts.some((p) => p.tcy)) continue;
    const frag = document.createDocumentFragment();
    for (const p of parts) {
      if (p.tcy) {
        const span = document.createElement("span");
        span.className = "sb-tcy";
        span.textContent = p.text;
        frag.append(span);
        count++;
      } else {
        frag.append(p.text);
      }
    }
    node.replaceWith(frag);
  }
  return count;
}

/**
 * 画面幅に応じて data-sb-writing を切り替える。
 * 幅が breakpoint 以上なら縦組み、未満なら横組み。
 *
 * @param {Element} paper `.sb-paper` の要素
 * @param {{ breakpoint?: number }} [options] breakpoint は px（既定 768）
 * @returns {() => void} 監視を止める関数
 */
export function responsive(paper, { breakpoint = 768 } = {}) {
  const mq = matchMedia(`(min-width: ${breakpoint}px)`);
  const apply = () => paper.setAttribute("data-sb-writing", mq.matches ? "vertical" : "horizontal");
  apply();
  mq.addEventListener("change", apply);
  return () => mq.removeEventListener("change", apply);
}

/**
 * 座標指定グリッド（.sb-page--grid）で、指定した長方形に収まらずにはみ出している記事を探す。
 * 文章を減らすか、段数や行数を増やして直す。
 *
 * 収まらない本文は、段軸方向（縦組みでは天地、横組みでは左右）に新しい段として
 * 追加される。そのため、本文の範囲（Range）の端が記事の外にあるかどうかで判定する。
 * 罫線用の疑似要素は本文ではないので、判定に含まれない。
 *
 * @param {ParentNode} [root]
 * @returns {Element[]} はみ出している記事（.sb-article）
 */
export function findOverflow(root = document) {
  return [...root.querySelectorAll(".sb-page--grid > .sb-article")].filter((el) => {
    const range = document.createRange();
    range.selectNodeContents(el);
    const box = el.getBoundingClientRect();
    const vertical = getComputedStyle(el).writingMode.startsWith("vertical");
    return [...range.getClientRects()].some((r) =>
      r.width > 0 && r.height > 0 && (vertical ? r.bottom > box.bottom + 1 : r.right > box.right + 1),
    );
  });
}

// <script type="module" src="shinbun.js"> で読み込んだとき、
// data-sb-auto-tcy を持つ要素（または .sb-paper）に自動で適用する。
if (typeof document !== "undefined") {
  const run = () => {
    document.querySelectorAll("[data-sb-auto-tcy]").forEach((el) => autoTcy(el));
    document.querySelectorAll("[data-sb-responsive]").forEach((el) => {
      const bp = Number(el.getAttribute("data-sb-responsive")) || undefined;
      responsive(el, { breakpoint: bp });
    });
  };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", run);
  else run();
  globalThis.Shinbun = { splitTcy, autoTcy, responsive, findOverflow };
}
