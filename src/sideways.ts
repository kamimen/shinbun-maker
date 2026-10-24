const RUN = /[A-Za-z@][\x21-\x7E]*(?: [\x21-\x7E]+)*/g;

export function splitSideways(text: string): { text: string; sideways: boolean }[] {
  const out: { text: string; sideways: boolean }[] = [];
  let last = 0;
  for (const m of text.matchAll(RUN)) {
    if (!/[a-z]/.test(m[0])) continue;
    if (m.index > last) out.push({ text: text.slice(last, m.index), sideways: false });
    out.push({ text: m[0], sideways: true });
    last = m.index + m[0].length;
  }
  if (last < text.length) out.push({ text: text.slice(last), sideways: false });
  return out;
}

const SKIP = ".sb-tcy, .sb-sideways";

export function autoSideways(root: ParentNode): number {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      if (!node.nodeValue || !/[a-z]/.test(node.nodeValue)) return NodeFilter.FILTER_REJECT;
      return node.parentElement?.closest(SKIP) ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT;
    },
  });
  const targets: Text[] = [];
  while (walker.nextNode()) targets.push(walker.currentNode as Text);

  let count = 0;
  for (const node of targets) {
    const parts = splitSideways(node.nodeValue ?? "");
    if (!parts.some((p) => p.sideways)) continue;
    const frag = document.createDocumentFragment();
    for (const p of parts) {
      if (p.sideways) {
        const span = document.createElement("span");
        span.className = "sb-sideways";
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
