const fs = require("node:fs");
const http = require("node:http");
const path = require("node:path");
const { spawn } = require("node:child_process");

const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const DEBUG_PORT = 9337;

function parseArgs(argv) {
  const sites = [];
  let output = "";
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === "--site" || argv[i] === "--url") {
      const kind = argv[i].slice(2);
      const raw = argv[++i] || "";
      const split = raw.indexOf("=");
      if (split < 1) throw new Error("Expected name=value after --" + kind);
      sites.push({ kind, name: raw.slice(0, split), value: raw.slice(split + 1) });
    } else if (argv[i] === "--output") {
      output = argv[++i] || "";
    }
  }
  if (!sites.length) throw new Error("Pass at least one --site name=directory or --url name=https://...");
  return { sites, output };
}

function mime(file) {
  const ext = path.extname(file).toLowerCase();
  return {
    ".html": "text/html; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".js": "text/javascript; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".svg": "image/svg+xml",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".webp": "image/webp",
    ".woff2": "font/woff2"
  }[ext] || "application/octet-stream";
}

function serveDirectory(root, port) {
  const resolvedRoot = fs.realpathSync(root);
  const server = http.createServer((req, res) => {
    let pathname;
    try {
      pathname = decodeURIComponent(new URL(req.url, "http://localhost").pathname);
    } catch {
      res.writeHead(400).end("bad request");
      return;
    }
    const relative = pathname.replace(/^\/+/, "");
    let file = path.resolve(resolvedRoot, relative || "index.html");
    if (!file.startsWith(resolvedRoot + path.sep) && file !== resolvedRoot) {
      res.writeHead(403).end("forbidden");
      return;
    }
    try {
      if (fs.statSync(file).isDirectory()) file = path.join(file, "index.html");
      const body = fs.readFileSync(file);
      res.writeHead(200, {
        "content-type": mime(file),
        "cache-control": "no-store",
        "access-control-allow-origin": "*"
      });
      res.end(body);
    } catch {
      res.writeHead(404).end("not found");
    }
  });
  return new Promise((resolve) => server.listen(port, "127.0.0.1", () => resolve(server)));
}

async function waitForJson(url, attempts = 80) {
  for (let i = 0; i < attempts; i += 1) {
    try {
      const response = await fetch(url);
      if (response.ok) return response.json();
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error("Chrome debugging endpoint did not become ready");
}

class CDP {
  constructor(url) {
    this.nextId = 1;
    this.pending = new Map();
    this.listeners = new Map();
    this.socket = new WebSocket(url);
  }

  async open() {
    await new Promise((resolve, reject) => {
      this.socket.addEventListener("open", resolve, { once: true });
      this.socket.addEventListener("error", reject, { once: true });
    });
    this.socket.addEventListener("message", (event) => {
      const message = JSON.parse(event.data);
      if (message.id && this.pending.has(message.id)) {
        const entry = this.pending.get(message.id);
        this.pending.delete(message.id);
        if (message.error) entry.reject(new Error(message.error.message));
        else entry.resolve(message.result || {});
        return;
      }
      const handlers = this.listeners.get(message.method) || [];
      handlers.forEach((handler) => handler(message.params || {}));
    });
  }

  send(method, params = {}) {
    const id = this.nextId++;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.socket.send(JSON.stringify({ id, method, params }));
    });
  }

  on(method, handler) {
    const handlers = this.listeners.get(method) || [];
    handlers.push(handler);
    this.listeners.set(method, handlers);
  }

  close() {
    this.socket.close();
  }
}

async function evaluate(cdp, expression) {
  const result = await cdp.send("Runtime.evaluate", {
    expression,
    awaitPromise: true,
    returnByValue: true
  });
  if (result.exceptionDetails) throw new Error("Page evaluation failed");
  return result.result.value;
}

const OBSERVER_SCRIPT = `
(() => {
  window.__portfolioAudit = { cls: 0, lcp: 0 };
  try {
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (!entry.hadRecentInput) window.__portfolioAudit.cls += entry.value;
      }
    }).observe({ type: "layout-shift", buffered: true });
  } catch {}
  try {
    new PerformanceObserver((list) => {
      const entries = list.getEntries();
      const last = entries[entries.length - 1];
      if (last) window.__portfolioAudit.lcp = last.startTime;
    }).observe({ type: "largest-contentful-paint", buffered: true });
  } catch {}
})();
`;

const PAGE_AUDIT_SCRIPT = `
(() => {
  const visible = (el) => {
    const style = getComputedStyle(el);
    const rect = el.getBoundingClientRect();
    return style.display !== "none" && style.visibility !== "hidden" && rect.width > 0 && rect.height > 0;
  };
  const controls = [...document.querySelectorAll("button,input,select,textarea,[role=button],a[href]")].filter(visible);
  const controlName = (el) => {
    const label = el.id ? document.querySelector('label[for="' + CSS.escape(el.id) + '"]') : null;
    return (el.getAttribute("aria-label") || el.getAttribute("title") ||
      (label && label.textContent) || (el.closest("label") && el.closest("label").textContent) ||
      el.textContent || el.value || "").trim();
  };
  const measureControls = (items) => items.filter((el) => {
    const rect = el.getBoundingClientRect();
    return rect.width < 44 || rect.height < 44;
  }).map((el) => {
    const rect = el.getBoundingClientRect();
    return {
      tag: el.tagName.toLowerCase(),
      name: controlName(el).slice(0, 80),
      width: Math.round(rect.width),
      height: Math.round(rect.height)
    };
  }).slice(0, 40);
  const unnamed = controls.filter((el) => {
    const text = controlName(el);
    return !text && !el.getAttribute("aria-labelledby");
  }).map((el) => el.outerHTML.slice(0, 180));
  const smallControls = measureControls(controls.filter((el) => !el.matches("a[href]:not([role=button])")));
  const primaryControls = [...document.querySelectorAll([
    ".cta-1", ".cta-2", ".agent-cta", ".button-primary", ".primary", ".cat-pill",
    ".theme-toggle", "#avApp .hd-ctx button", "#avApp .hd-phase-strip button",
    "#avApp .hd-icon-btn", "#avApp .seg button", ".bar input", ".bar select",
    ".bar .tog", ".bar .btn", ".copy", ".fill", ".link"
  ].join(","))].filter(visible);
  return {
    title: document.title,
    url: location.href,
    metrics: window.__portfolioAudit || { cls: null, lcp: null },
    headings: [...document.querySelectorAll("h1,h2,h3")].filter(visible).map((el) => ({
      level: Number(el.tagName.slice(1)),
      text: el.textContent.trim().slice(0, 160)
    })).slice(0, 40),
    landmarks: {
      main: document.querySelectorAll("main").length,
      nav: document.querySelectorAll("nav").length,
      header: document.querySelectorAll("header").length,
      footer: document.querySelectorAll("footer").length
    },
    controls: controls.length,
    unnamedControls: unnamed,
    smallControls,
    smallPrimaryControls: measureControls(primaryControls),
    links: [...document.querySelectorAll("a[href]")].filter(visible).map((el) => ({
      text: el.textContent.trim().replace(/\s+/g, " ").slice(0, 100),
      href: el.href
    })).slice(0, 200),
    horizontalOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 2,
    documentWidth: document.documentElement.scrollWidth,
    viewportWidth: document.documentElement.clientWidth,
    activeAnimations: document.getAnimations().filter((animation) => animation.playState === "running").length,
    resources: performance.getEntriesByType("resource").map((entry) => ({
      name: entry.name,
      type: entry.initiatorType,
      transferSize: entry.transferSize,
      duration: Math.round(entry.duration)
    }))
  };
})();
`;

async function auditPage(name, url) {
  const created = await fetch("http://127.0.0.1:" + DEBUG_PORT + "/json/new?" + encodeURIComponent("about:blank"), { method: "PUT" }).then((res) => res.json());
  const cdp = new CDP(created.webSocketDebuggerUrl);
  await cdp.open();
  let encodedBytes = 0;
  cdp.on("Network.loadingFinished", (event) => { encodedBytes += event.encodedDataLength || 0; });

  await Promise.all([
    cdp.send("Page.enable"),
    cdp.send("Runtime.enable"),
    cdp.send("Network.enable"),
    cdp.send("Performance.enable"),
    cdp.send("Accessibility.enable")
  ]);
  await cdp.send("Network.setCacheDisabled", { cacheDisabled: true });
  await cdp.send("Network.emulateNetworkConditions", {
    offline: false,
    latency: 150,
    downloadThroughput: 200000,
    uploadThroughput: 95000,
    connectionType: "cellular4g"
  });
  await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });
  const requiredViewports = [
    { name: "narrow-phone", width: 390, height: 844, deviceScaleFactor: 3, mobile: true },
    { name: "680-breakpoint", width: 680, height: 900, deviceScaleFactor: 2, mobile: false },
    { name: "tablet", width: 1024, height: 768, deviceScaleFactor: 2, mobile: false },
    { name: "desktop", width: 1440, height: 900, deviceScaleFactor: 1, mobile: false }
  ];
  await cdp.send("Emulation.setDeviceMetricsOverride", requiredViewports[0]);
  await cdp.send("Emulation.setEmulatedMedia", {
    features: [{ name: "prefers-reduced-motion", value: "reduce" }]
  });
  await cdp.send("Page.addScriptToEvaluateOnNewDocument", { source: OBSERVER_SCRIPT });
  await cdp.send("Page.navigate", { url });

  for (let i = 0; i < 80; i += 1) {
    const ready = await evaluate(cdp, "document.readyState");
    if (ready === "complete") break;
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  await new Promise((resolve) => setTimeout(resolve, 2500));

  const viewportResults = [];
  for (const viewport of requiredViewports) {
    await cdp.send("Emulation.setDeviceMetricsOverride", viewport);
    await new Promise((resolve) => setTimeout(resolve, 350));
    viewportResults.push({ viewport, audit: await evaluate(cdp, PAGE_AUDIT_SCRIPT) });
  }
  const mobile = viewportResults[0].audit;
  await evaluate(cdp, "document.body.focus(); document.activeElement && document.activeElement.blur()");
  const focusOrder = [];
  for (let i = 0; i < 20; i += 1) {
    await cdp.send("Input.dispatchKeyEvent", { type: "keyDown", key: "Tab", code: "Tab", windowsVirtualKeyCode: 9, nativeVirtualKeyCode: 9 });
    await cdp.send("Input.dispatchKeyEvent", { type: "keyUp", key: "Tab", code: "Tab", windowsVirtualKeyCode: 9, nativeVirtualKeyCode: 9 });
    focusOrder.push(await evaluate(cdp, `(() => {
      const el = document.activeElement;
      if (!el || el === document.body) return "BODY";
      return el.tagName.toLowerCase() + ":" + (el.getAttribute("aria-label") || el.textContent || el.value || "").trim().replace(/\\s+/g, " ").slice(0, 80);
    })()`));
  }

  const skipActivation = await evaluate(cdp, `(() => {
    const skip = document.querySelector(".sbd-skip-link,.skip-link");
    if (!skip) return { available: false };
    skip.focus();
    return { available: true, label: skip.textContent.trim(), href: skip.getAttribute("href") };
  })()`);
  if (skipActivation.available) {
    await cdp.send("Input.dispatchKeyEvent", { type: "keyDown", key: "Enter", code: "Enter", windowsVirtualKeyCode: 13, nativeVirtualKeyCode: 13 });
    await cdp.send("Input.dispatchKeyEvent", { type: "keyUp", key: "Enter", code: "Enter", windowsVirtualKeyCode: 13, nativeVirtualKeyCode: 13 });
    await new Promise((resolve) => setTimeout(resolve, 100));
    Object.assign(skipActivation, await evaluate(cdp, `(() => ({
      hash: location.hash,
      activeId: document.activeElement && document.activeElement.id,
      targetId: document.querySelector(location.hash) && document.querySelector(location.hash).id
    }))()`));
  }

  const ax = await cdp.send("Accessibility.getFullAXTree");
  const axUnnamedInteractive = (ax.nodes || []).filter((node) => {
    const role = node.role && node.role.value;
    const interactive = ["button", "link", "textbox", "combobox", "checkbox", "radio", "switch"].includes(role);
    return interactive && !(node.name && String(node.name.value || "").trim());
  }).map((node) => node.role.value).slice(0, 40);

  cdp.close();
  return {
    name,
    audited_at: new Date().toISOString(),
    mobile,
    required_viewports: viewportResults,
    transfer_bytes: Math.round(encodedBytes),
    focus_order_first_20: focusOrder,
    skip_activation: skipActivation,
    accessibility_tree_unnamed_interactive_roles: axUnnamedInteractive
  };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!fs.existsSync(CHROME)) throw new Error("Google Chrome not found");
  const servers = [];
  const targets = [];
  let nextPort = 9410;
  for (const site of args.sites) {
    if (site.kind === "site") {
      const server = await serveDirectory(site.value, nextPort);
      servers.push(server);
      targets.push({ name: site.name, url: "http://127.0.0.1:" + nextPort + "/" });
      nextPort += 1;
    } else {
      targets.push({ name: site.name, url: site.value });
    }
  }

  const profileDir = "/tmp/portfolio-browser-audit-" + process.pid;
  const chrome = spawn(CHROME, [
    "--headless=new",
    "--disable-gpu",
    "--no-first-run",
    "--no-default-browser-check",
    "--disable-extensions",
    "--remote-debugging-port=" + DEBUG_PORT,
    "--user-data-dir=" + profileDir,
    "about:blank"
  ], { stdio: "ignore" });

  const results = [];
  try {
    await waitForJson("http://127.0.0.1:" + DEBUG_PORT + "/json/version");
    for (const target of targets) {
      process.stdout.write("Auditing " + target.name + "...\n");
      results.push(await auditPage(target.name, target.url));
    }
  } finally {
    chrome.kill("SIGTERM");
    servers.forEach((server) => server.close());
    await new Promise((resolve) => {
      if (chrome.exitCode !== null) {
        resolve();
        return;
      }
      const timeout = setTimeout(resolve, 2000);
      chrome.once("exit", () => {
        clearTimeout(timeout);
        resolve();
      });
    });
    fs.rmSync(profileDir, { recursive: true, force: true });
  }

  const report = {
    schema_version: "1.0.0",
    generated_at: new Date().toISOString(),
    method: "Chrome DevTools Protocol, mobile 4G and 4x CPU throttle, reduced motion, keyboard traversal, and 390/680/1024/1440 viewport checks",
    limitations: [
      "Lab metrics are synthetic local-run evidence, not field Core Web Vitals.",
      "VoiceOver speech output and meaning require a human assistive-technology pass.",
      "Automated control-name and target checks do not certify WCAG conformance."
    ],
    results
  };
  const rendered = JSON.stringify(report, null, 2) + "\n";
  if (args.output) {
    const outputPath = path.resolve(args.output);
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    fs.writeFileSync(outputPath, rendered);
  }
  process.stdout.write(rendered);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
