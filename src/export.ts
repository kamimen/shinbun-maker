import shinbunCss from "../vendor/shinbun.min.css?inline";
import paperCss from "./paper.css?inline";
import { downloadBlob } from "./storage.ts";

const MM = 96 / 25.4;

export interface PageSize {
  label: string;
  size: (paper: DOMRect) => { w: number; h: number };
}

export const PAGE_SIZES: Record<string, PageSize> = {
  fit: { label: "紙面の大きさのまま", size: (p) => ({ w: p.width, h: p.height }) },
  a4p: { label: "A4 縦", size: () => ({ w: 210 * MM, h: 297 * MM }) },
  a4l: { label: "A4 横", size: () => ({ w: 297 * MM, h: 210 * MM }) },
  a3p: { label: "A3 縦", size: () => ({ w: 297 * MM, h: 420 * MM }) },
  a3l: { label: "A3 横", size: () => ({ w: 420 * MM, h: 297 * MM }) },
};

function escapeCss(css: string): string {
  return css.replace(/&/g, "&amp;").replace(/</g, "&lt;");
}

function toImage(paper: HTMLElement, width: number, height: number): Promise<HTMLImageElement> {
  const clone = paper.cloneNode(true) as HTMLElement;
  clone.style.margin = "0";
  const body = new XMLSerializer().serializeToString(clone);
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">` +
    `<foreignObject width="100%" height="100%"><div xmlns="http://www.w3.org/1999/xhtml">` +
    `<style>${escapeCss(shinbunCss + paperCss)}</style>${body}</div></foreignObject></svg>`;
  const img = new Image();
  return new Promise((resolve, reject) => {
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("紙面を画像にできませんでした"));
    img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  });
}

export async function paperToCanvas(paper: HTMLElement, scale: number): Promise<HTMLCanvasElement> {
  const rect = paper.getBoundingClientRect();
  const width = Math.ceil(rect.width);
  const height = Math.ceil(rect.height);
  const img = await toImage(paper, width, height);
  const canvas = document.createElement("canvas");
  canvas.width = width * scale;
  canvas.height = height * scale;
  canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
  return canvas;
}

export async function downloadPng(paper: HTMLElement, scale: number): Promise<void> {
  const canvas = await paperToCanvas(paper, scale);
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
  if (!blob) throw new Error("PNG を作れませんでした");
  downloadBlob(blob, "shinbun.png");
}

export function printPdf(paper: HTMLElement, sizeKey: string): void {
  const rect = paper.getBoundingClientRect();
  const page = (PAGE_SIZES[sizeKey] ?? PAGE_SIZES.fit!).size(rect);
  const zoom = Math.min(page.w / rect.width, page.h / rect.height);

  const root = document.createElement("div");
  root.id = "print-root";
  const clone = paper.cloneNode(true) as HTMLElement;
  clone.style.zoom = String(zoom);
  root.append(clone);

  const style = document.createElement("style");
  style.textContent = `
    @page { size: ${page.w}px ${page.h}px; margin: 0; }
    @media screen { #print-root { display: none; } }
    @media print {
      body > :not(#print-root) { display: none !important; }
      #print-root, #print-root * { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
    }`;
  document.head.append(style);
  document.body.append(root);

  const cleanup = () => {
    root.remove();
    style.remove();
  };
  window.addEventListener("afterprint", cleanup, { once: true });
  window.print();
}
