/** Saves text as a file through a temporary object URL. */
export function downloadText(text: string, filename: string, type = "application/json"): void {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export const sessionFilename = (date = new Date()): string => `fmp-camera-sim-${date.toISOString().slice(0, 10)}.json`;
