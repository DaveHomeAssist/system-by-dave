import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import postcss from "postcss";
import type { Plugin } from "vite";

// Scope existing department styles at build time; their standalone files stay
// unchanged and cannot override another department or the suite's shell.
export function departmentStyles(): Plugin {
  const sources: [string, string[]][] = [
    ["audio", ["apps/av-audio/src/styles.css"]],
    ["show-control", ["apps/show-control/src/styles.css"]],
    ["show-ops", ["apps/show-ops/src/styles.css"]],
    ["front-office", ["apps/front-office/src/styles.css"]],
    ["shop", ["apps/the-shop/src/styles.css"]],
    ["infrastructure", ["apps/infrastructure/src/styles.css"]],
    ["lighting", ["apps/av-lighting/src/styles.css"]],
    ["av-calculator", ["css/av-calculator.css", "css/av-viewport.css", "apps/av-calculator/src/styles.css"]],
  ];
  return {
    name: "native-department-styles",
    resolveId: id => id === "virtual:department.css" ? "\0department.css" : undefined,
    load(id) {
      if (id !== "\0department.css") return;
      return sources.flatMap(([department, files]) => files.map(file => {
        const path = resolve(__dirname, "../..", file); this.addWatchFile(path);
        const css = postcss.parse(readFileSync(path, "utf8"));
        const scope = `[data-department="${department}"]`;
        css.walkRules(rule => {
          if (rule.parent?.type === "atrule" && /keyframes$/.test(rule.parent.name)) return;
          const selectors = rule.selectors.filter(s => !/^(html|body|#root|#calculatorRoot)(\b|[ .:#[])/.test(s.trim()) && !["html", "body", "#root", "#calculatorRoot"].includes(s.trim()));
          if (!selectors.length) { rule.remove(); return; }
          rule.selectors = selectors.map(s => s.trim() === ":root" ? scope : `${scope} ${s}`);
        });
        return css.toString();
      })).join("\n");
    },
  };
}
