const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");

const file = new URL("./youtube-pipeline.html", `file://${__dirname}/`);
const html = fs.readFileSync(file, "utf8");
const match = html.match(/<script>([\s\S]*)<\/script>/);

assert.ok(match, "script block should exist");

const calls = [];
const sandbox = {
  console,
  alert: () => {},
  confirm: () => true,
  getSelection: () => ({ toString: () => "" }),
  navigator: { onLine: true },
  localStorage: {
    getItem: () => null,
    setItem: () => {},
    removeItem: () => {},
  },
  crypto: { randomUUID: () => "new-test-id" },
  document: {
    addEventListener: () => {},
    querySelector: () => null,
    querySelectorAll: () => [],
  },
  window: {
    addEventListener: () => {},
    cowork: {
      callMcpTool: async (name, args) => {
        calls.push({ name, args });
        return { structuredContent: {} };
      },
    },
  },
};

vm.createContext(sandbox);
vm.runInContext(`${match[1]}\nthis.__test = { saveVideo };`, sandbox);

const baseVideo = {
  id: "12345678-1234-1234-1234-123456789abc",
  title: "Metadata only",
  stage: "Idea",
  state: "Active",
  priority: "P2",
  logline: "Ready",
  hook: "",
  keyword: "",
  beats: "",
  broll: "",
  cta: "",
  thumbConcept: "",
  seoTitle: "",
  seoDesc: "",
  tags: "",
  ytUrl: "",
  thumbUrl: "",
  recordDate: "",
  publishDate: "",
  runtime: "",
  script: "",
};

async function run() {
  calls.length = 0;
  await sandbox.__test.saveVideo({ ...baseVideo, scriptLoaded: false, scriptDirty: false });
  assert.equal(calls.length, 1, "metadata save should only update properties when script is not loaded");
  assert.equal(calls[0].args.command, "update_properties");

  calls.length = 0;
  await sandbox.__test.saveVideo({ ...baseVideo, scriptLoaded: true, scriptDirty: false });
  assert.equal(calls.length, 1, "loaded but unchanged script should not replace content");
  assert.equal(calls[0].args.command, "update_properties");

  calls.length = 0;
  await sandbox.__test.saveVideo({ ...baseVideo, script: "body", scriptLoaded: true, scriptDirty: true });
  assert.equal(calls.length, 2, "dirty loaded script should update properties and replace content");
  assert.equal(calls[1].args.command, "replace_content");
  assert.equal(calls[1].args.new_str, "body");
}

run().then(
  () => console.log("youtube pipeline regression checks passed"),
  err => {
    console.error(err);
    process.exitCode = 1;
  },
);
