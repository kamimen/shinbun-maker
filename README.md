# Shimen Maker (紙面メーカー)

A web app that lays out a newspaper page from your text and images with [shinbun.css](https://github.com/kamimen/shinbun-css), and saves it as PDF or PNG. It supports both vertical writing (縦組み, *tategumi*) and horizontal writing (横組み, *yokogumi*).

English | [日本語](README_ja.md)

- Place nameplates, articles, photos, boxes, horizontal headlines and ad slots, and drag them into position
- Positions snap to the dan (column) and line grid (`data-sb-x / w / y / span` in shinbun.css)
- Your text and images stay in this browser. Nothing is sent to a server
- An article that does not fit its rectangle is reported as an overflow
- Save as PNG (image), PDF (through the browser's print dialog), or JSON (to keep editing later)

## Usage

1. Add parts with the "＋" buttons on the left
2. Click a part on the page to select it, and drag to move it. Drag a square at a corner to resize. You can also pick a part from the parts list on the left (useful when parts overlap, or to find an article that overflows). With the keyboard, arrow keys move it, Shift + arrow keys resize it, and Delete removes it. Use "Forward" and "Back" in the right panel to reorder overlapping parts
3. Edit text, images and the numeric position in the right panel. Double-click a part to jump to its text field. You can also drop an image file onto the page
4. If the page is larger than the screen, shrink it with the display menu in the top bar ("Fit to screen")
5. Save with "PNG" or "PDF" in the top bar

"PDF" opens the browser's print dialog. Choose "Save as PDF" as the destination, and turn on background graphics. The paper size is chosen in the select next to the "PDF" button.

## Browser support

> [!CAUTION]
> Display was checked only in Chrome. Firefox and Safari have not been tested. For PDF, I checked up to opening the print dialog.

## Development

```sh
npm install
npm run dev        # dev server
npm test           # unit tests (coordinate math, state changes)
npm run typecheck  # type check
npm run build      # build dist/
```

Built with TypeScript and Vite. It uses shinbun.css (CSS and JavaScript) from `vendor/`.

## License

[MIT License](LICENSE)

This app does not imitate the pages of any particular newspaper. All content in the sample is fictional.
