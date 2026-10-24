function textOverflows(el: HTMLElement, beyond: (r: DOMRect, box: DOMRect) => boolean): boolean {
  const box = el.getBoundingClientRect();
  const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
  const range = document.createRange();
  while (walker.nextNode()) {
    range.selectNodeContents(walker.currentNode);
    for (const r of range.getClientRects()) if (r.width > 0 && r.height > 0 && beyond(r, box)) return true;
  }
  return false;
}

export function overflows(el: HTMLElement): boolean {
  const vertical = getComputedStyle(el).writingMode.startsWith("vertical");
  if (el.classList.contains("sb-article")) {
    return textOverflows(el, (r, box) =>
      vertical ? r.bottom > box.bottom + 1 || r.left < box.left - 1 : r.right > box.right + 1 || r.bottom > box.bottom + 1,
    );
  }
  if (el.classList.contains("sb-box")) {
    return textOverflows(el, (r, box) => (vertical ? r.left < box.left - 1 : r.bottom > box.bottom + 1));
  }
  return el.scrollWidth > el.clientWidth + 1 || el.scrollHeight > el.clientHeight + 1;
}
