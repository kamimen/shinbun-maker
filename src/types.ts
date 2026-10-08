export type Writing = "vertical" | "horizontal";

export interface Paper {
  writing: Writing;
  dan: number;
  lines: number;
  chars: number;
  fs: number;
}

export interface Rect {
  x: number;
  w: number;
  y: number;
  span: number;
}

interface Base extends Rect {
  id: string;
}

export interface NameplateItem extends Base {
  kind: "nameplate";
  title: string;
  meta: string;
}

export type HeadlineSize = "xl" | "l" | "m" | "s";

export interface ArticleItem extends Base {
  kind: "article";
  kicker: string;
  headline: string;
  headlineSize: HeadlineSize;
  sleeve: string;
  dateline: string;
  lead: string;
  body: string;
  byline: string;
  isLead: boolean;
}

export interface PhotoItem extends Base {
  kind: "photo";
  image: string;
  caption: string;
}

export interface BoxItem extends Base {
  kind: "box";
  title: string;
  body: string;
}

export interface YokoItem extends Base {
  kind: "yoko";
  text: string;
  reverse: boolean;
  size: number;
}

export interface AdItem extends Base {
  kind: "ad";
  label: string;
}

export type Item = NameplateItem | ArticleItem | PhotoItem | BoxItem | YokoItem | AdItem;
export type Kind = Item["kind"];

export interface State {
  paper: Paper;
  items: Item[];
}
