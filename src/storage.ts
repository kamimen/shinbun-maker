import { normalizeState } from "./state.ts";
import type { State } from "./types.ts";

const DB = "shinbun-maker";
const STORE = "project";
const KEY = "current";

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function saveState(state: State): Promise<void> {
  try {
    const db = await open();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, "readwrite");
      tx.objectStore(STORE).put(JSON.stringify(state), KEY);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  } catch {
    // 保存できなくても、編集は続けられる
  }
}

export async function loadState(): Promise<State | null> {
  try {
    const db = await open();
    const raw = await new Promise<unknown>((resolve, reject) => {
      const req = db.transaction(STORE).objectStore(STORE).get(KEY);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    db.close();
    return typeof raw === "string" ? normalizeState(JSON.parse(raw)) : null;
  } catch {
    return null;
  }
}

export function downloadBlob(blob: Blob, name: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function exportJson(state: State): void {
  downloadBlob(new Blob([JSON.stringify(state)], { type: "application/json" }), "shinbun.json");
}

export async function importJson(file: File): Promise<State> {
  return normalizeState(JSON.parse(await file.text()));
}
