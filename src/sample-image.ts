const icon = [
  '<circle cx="128" cy="128" r="122" fill="#e6e3da" stroke="#1f1b16" stroke-width="6"/>',
  '<path d="M78 44 H146 L180 78 V212 H78 Z" fill="#1f1b16"/>',
  '<path d="M146 44 V78 H180 Z" fill="#a3281f"/>',
  '<line x1="102" y1="104" x2="102" y2="190" stroke="#e6e3da" stroke-width="6"/>',
  '<line x1="129" y1="104" x2="129" y2="168" stroke="#e6e3da" stroke-width="6"/>',
  '<line x1="156" y1="104" x2="156" y2="190" stroke="#e6e3da" stroke-width="6"/>',
].join("");

const svg =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 1000" width="1000" height="1000">' +
  '<rect width="1000" height="1000" fill="#cfc6b0"/>' +
  `<g transform="translate(372 372)">${icon}</g>` +
  "</svg>";

export const KAMIMEN_ICON = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
