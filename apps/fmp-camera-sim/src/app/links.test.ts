import { describe, expect, it } from "vitest";
import { readExerciseLink, SUITE_LINKS } from "./links";

describe("exercise links", () => {
  it("ignores an address without an exercise", () => {
    expect(readExerciseLink("")).toBeNull();
    expect(readExerciseLink("?diagnostics=1")).toBeNull();
  });

  it("reads each exercise and keeps the other parameters", () => {
    expect(readExerciseLink("?exercise=wide")).toEqual({ exercise: "wide", unknown: null, search: "" });
    expect(readExerciseLink("?diagnostics=1&exercise=follow")).toEqual({ exercise: "follow", unknown: null, search: "?diagnostics=1" });
    expect(readExerciseLink("?exercise=%20recall%20")?.exercise).toBe("recall");
  });

  it("reports a value that names no exercise, trimmed and capped", () => {
    expect(readExerciseLink("?exercise=Wide")).toEqual({ exercise: null, unknown: "Wide", search: "" });
    expect(readExerciseLink("?exercise=")).toEqual({ exercise: null, unknown: "", search: "" });
    expect(readExerciseLink(`?exercise=${"x".repeat(80)}`)?.unknown).toHaveLength(40);
  });
});

describe("suite links", () => {
  it("are root paths on housevideo.app", () => {
    for (const path of Object.values(SUITE_LINKS)) expect(path.startsWith("/")).toBe(true);
  });
});
