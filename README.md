# 紙面メーカー

[shinbun.css](https://github.com/kamimen/shinbun-css) で、文章と画像から新聞の紙面を作り、PDF や PNG で保存する Web アプリです。縦組みと横組みの両方で組めます。

![license: MIT](https://img.shields.io/badge/license-MIT-blue) ![tested: Chrome](https://img.shields.io/badge/tested-Chrome-brightgreen) ![not tested: Firefox, Safari](https://img.shields.io/badge/not%20tested-Firefox%20%C2%B7%20Safari-red)

日本語 | [English](README_en.md)

- 題字、記事、写真、囲み、横見出し、広告枠を置き、ドラッグで位置と大きさを決めます
- 位置は、段と行の格子に合わせて決まります（shinbun.css の `data-sb-x / w / y / span`）
- 文章や画像は、この端末のブラウザの中だけで扱います。サーバーには送りません
- 記事が長方形に収まらないときは、「はみ出し」として知らせます
- 作った紙面は、PNG（画像）、PDF（ブラウザの印刷から保存）、JSON（続きを編集するためのファイル）で保存できます

## 使い方

1. 左の「＋」で部品を置きます
2. 紙面の部品をクリックして選び、ドラッグで動かします。四隅の四角をドラッグすると、大きさが変わります。左の「部品の一覧」からも選べます（重なって選びにくいとき、はみ出した記事を探すときに使います）。キーボードでは、矢印キーで動かし、Shift + 矢印キーで大きさを変え、Delete で削除します。重なりは、右のパネルの「前へ」「後ろへ」で入れ替えます
3. 右のパネルで、文章や画像、位置の数値を直します。部品をダブルクリックすると、パネルの文章欄に移ります。画像ファイルは、紙面へドラッグ & ドロップしても入れられます
4. 紙面が画面より大きいときは、上のバーの「表示」で縮小します（「全体を表示」）
5. 上のバーの「PNG」または「PDF」で保存します

「PDF」は、ブラウザの印刷画面を開きます。送信先を「PDF に保存」にしてください。用紙の大きさは、「PDF」の左の選択で決めます。印刷の画面では、背景のグラフィックスを有効にしてください。

## ブラウザ対応

> [!CAUTION]
> 表示を確認したのは Chrome だけです。Firefox と Safari では確認していません。PDF の保存は、印刷画面を開くところまでを確認しています。

## 開発

```sh
npm install
npm run dev        # 開発サーバー
npm test           # 単体テスト（座標の計算、状態の変更）
npm run typecheck  # 型検査
npm run build      # dist/ を作る
```

TypeScript と Vite で作っています。紙面の部品は、`vendor/` にある shinbun.css（CSS と JavaScript）を使います。

## ライセンス

[MIT License](LICENSE)

特定の新聞社の紙面を模したものではありません。見本の内容は、すべて架空です。
