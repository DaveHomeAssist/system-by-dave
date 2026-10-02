export type History<T> = { past: T[]; present: T; future: T[]; group?: string };
export const createHistory = <T,>(present: T): History<T> => ({ past: [], present, future: [] });
export function record<T>(history: History<T>, next: T, group?: string): History<T> {
  if (JSON.stringify(history.present) === JSON.stringify(next)) return history;
  const coalesce = group !== undefined && group === history.group && !history.future.length;
  return { past: coalesce ? history.past : [...history.past, history.present].slice(-80), present: next, future: [], group };
}
export function undo<T>(history: History<T>): History<T> {
  if (!history.past.length) return history;
  return { past: history.past.slice(0, -1), present: history.past.at(-1)!, future: [history.present, ...history.future] };
}
export function redo<T>(history: History<T>): History<T> {
  if (!history.future.length) return history;
  return { past: [...history.past, history.present], present: history.future[0], future: history.future.slice(1) };
}
