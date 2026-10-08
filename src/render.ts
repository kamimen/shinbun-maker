import type { Item, State } from "./types.ts";

function el<K extends keyof HTMLElementTagNameMap>(tag: K, className?: string | null, text?: string): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function paragraphs(text: string): string[] {
  return text
    .split(/\n\s*\n/)
    .map((p) => p.replace(/\n/g, ""))
    .filter((p) => p.trim() !== "");
}

function build(it: Item): HTMLElement {
  switch (it.kind) {
    case "nameplate": {
      const node = el("header", "sb-nameplate");
      node.append(el("h1", "sb-nameplate__title", it.title));
      if (it.meta) node.append(el("p", "sb-nameplate__meta", it.meta));
      return node;
    }
    case "article": {
      const node = el("article", `sb-article${it.isLead ? " sb-article--lead" : ""}`);
      if (it.kicker) node.append(el("p", "sb-kicker", it.kicker));
      node.append(el("h2", `sb-headline sb-headline--${it.headlineSize}`, it.headline));
      if (it.sleeve) node.append(el("p", "sb-sleeve", it.sleeve));
      if (it.dateline) node.append(el("p", "sb-dateline", it.dateline));
      if (it.lead) node.append(el("p", "sb-lead", it.lead));
      for (const p of paragraphs(it.body)) node.append(el("p", null, p));
      if (it.byline) node.append(el("p", "sb-byline", it.byline));
      return node;
    }
    case "photo": {
      const node = el("figure", "sb-photo");
      if (it.image) {
        const img = el("img", "sb-photo__img");
        img.src = it.image;
        img.alt = it.caption;
        node.append(img);
      } else {
        const empty = el("div", "sb-photo__img");
        empty.setAttribute("role", "img");
        empty.setAttribute("aria-label", "画像が未設定");
        node.append(empty);
      }
      if (it.caption) node.append(el("figcaption", "sb-photo__caption", it.caption));
      return node;
    }
    case "box": {
      const node = el("aside", "sb-box");
      if (it.title) node.append(el("p", "sb-box__title", it.title));
      for (const p of paragraphs(it.body)) node.append(el("p", null, p));
      return node;
    }
    case "yoko": {
      const node = el("h2", `sb-yoko${it.reverse ? " sb-yoko--reverse" : ""}`, it.text);
      node.style.fontSize = `${it.size}em`;
      return node;
    }
    case "ad":
      return el("div", "sb-ad", it.label);
  }
}

export function buildItem(it: Item): HTMLElement {
  const node = build(it);
  node.dataset.id = it.id;
  node.dataset.sbX = String(it.x);
  node.dataset.sbW = String(it.w);
  node.dataset.sbY = String(it.y);
  node.dataset.sbSpan = String(it.span);
  return node;
}

export function buildPaper({ paper, items }: State): HTMLElement {
  const root = el("div", "sb-paper");
  root.dataset.sbWriting = paper.writing;
  if (paper.writing === "vertical") root.dataset.sbAutoTcy = "";
  root.style.setProperty("--sb-chars", String(paper.chars));
  root.style.setProperty("--sb-lines", String(paper.lines));
  root.style.setProperty("--sb-fs", `${paper.fs}rem`);
  root.style.setProperty(paper.writing === "horizontal" ? "--sb-dan-h" : "--sb-dan", String(paper.dan));

  const page = el("main", "sb-page sb-page--grid");
  for (const it of items) page.append(buildItem(it));
  root.append(page);
  return root;
}
