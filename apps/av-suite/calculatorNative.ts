import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import postcss from "postcss";
import type { Plugin } from "vite";

// Compile the existing, tested engine into the suite; no eval, iframe, copied
// formulas or additional runtime requests. Standalone Calculator is unchanged.
export function calculatorNative(): Plugin {
  return {
    name: "calculator-native-panels",
    resolveId: id => id.startsWith("virtual:calculator-native") ? "\0" + id.slice(8) : undefined,
    load(id) {
      const read = (file: string) => { const path = resolve(__dirname, "../..", file); this.addWatchFile(path); return readFileSync(path, "utf8"); };
      if (id === "\0calculator-native") return `export function initializeCalculator(document) {\n${read("js/av-viewport.js")}\n${read("js/av-calculator.js")}\n${read("js/av-calculator-field-sets.js")}\n}`;
      if (id !== "\0calculator-native.css") return;
      return ["css/av-calculator.css", "css/av-viewport.css", "apps/av-calculator/src/styles.css"].map(file => {
        const css = postcss.parse(read(file));
        css.walkRules(rule => {
          if (rule.parent?.type === "atrule" && /keyframes$/.test(rule.parent.name)) return;
          const selectors = rule.selectors.filter(s => !/^(html|body|#root|#calculatorRoot)(?:$|[ .:#\[])/.test(s.trim()));
          if (!selectors.length) { rule.remove(); return; }
          rule.selectors = selectors.map(s => s.trim() === ":root" ? ".calculator-native" : `.calculator-native ${s}`);
        });
        return css.toString();
      }).join("\n") + "\n" + read("apps/av-calculator/src/native.css");
    },
  };
}
