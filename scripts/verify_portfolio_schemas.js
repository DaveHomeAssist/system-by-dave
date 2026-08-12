const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const schemaDir = path.join(root, "schemas");
const schemaFiles = [
  "signal-record.schema.json",
  "evidence-record.schema.json",
  "release-manifest.schema.json",
  "run-event.schema.json"
];

for (const name of schemaFiles) {
  const schema = JSON.parse(fs.readFileSync(path.join(schemaDir, name), "utf8"));
  if (schema.$schema !== "https://json-schema.org/draft/2020-12/schema") {
    throw new Error(name + ": expected JSON Schema 2020-12");
  }
  if (schema.type !== "object" || schema.additionalProperties !== false) {
    throw new Error(name + ": top-level contract must be a closed object");
  }
  if (!Array.isArray(schema.required) || !schema.required.includes("schema_version")) {
    throw new Error(name + ": schema_version must be required");
  }
}

const runEvent = JSON.parse(fs.readFileSync(path.join(schemaDir, "examples/run-event.json"), "utf8"));
const release = JSON.parse(fs.readFileSync(path.join(schemaDir, "examples/release-manifest.json"), "utf8"));
for (const [name, value] of [["run event", runEvent], ["release manifest", release]]) {
  if (value.schema_version !== "1.0.0") throw new Error(name + ": wrong schema version");
  if (!/^[a-f0-9]{40}$/.test(value.commit_sha)) throw new Error(name + ": invalid commit SHA");
}
if (!release.artifacts.length || !release.verification.length) {
  throw new Error("release manifest: proof arrays must not be empty");
}

console.log("Portfolio schemas: 4 contracts and 2 examples verified");
