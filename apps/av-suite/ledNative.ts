import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import postcss from "postcss";
import type { Plugin } from "vite";

/* Compile the existing LED controller and viewer without copying formulas or
   introducing a second storage contract. Queries use the pack's owned DOM. */
export function ledNative(): Plugin {
  return {
    name: "led-native-panels",
    resolveId: id => id.startsWith("virtual:led-native") ? "\0" + id.slice(8) : undefined,
    load(id) {
      const read = (file: string) => { const path = resolve(__dirname, "../..", file); this.addWatchFile(path); return readFileSync(path, "utf8"); };
      if (id === "\0led-native") {
        const viewer = read("js/led-wall-viewer.js").replace(/^import .*?;\n/, "");
        return `import * as THREE from ${JSON.stringify(resolve(__dirname, "../../ProjectorThrow/vendor/three/three.module.min.js"))};
          export function initializeLED(document, fetch) { ${read("js/av-viewport.js")}\n${read("js/av-calculator.js").replace("new URL('av-calculator.html', window.location.href)", "new URL('/av-calculator.html', window.location.href)")}\n${viewer}\n }`;
      }
      if (id !== "\0led-native.css") return;
      const html = read("led-wall-calculator.html");
      const styles = [...html.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)].map(match => match[1]);
      return [read("css/av-calculator.css"), ...styles].map(text => {
        const css = postcss.parse(text);
        css.walkRules(rule => {
          if (rule.parent?.type === "atrule" && /keyframes$/.test(rule.parent.name)) return;
          rule.selectors = rule.selectors.map(selector => {
            const local = selector.replace(/^html(?:\[[^\]]*\])?\s*|^body\s*|^:root\s*/, "").trim();
            return local ? `.led-native ${local}` : ".led-native";
          });
        });
        return css.toString();
      }).join("\n") + "\n" + read("apps/led-wall/src/native.css");
    },
  };
}
