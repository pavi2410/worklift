import { describe, test, expect } from "bun:test";
import { parseTargetTasks } from "./parseTarget.ts";

describe("parseTargetTasks", () => {
  const artifacts = new Map();

  test("parses direct task list", () => {
    const tasks = parseTargetTasks(
      [{ mkdir: { paths: ["build"] } }],
      "init",
      artifacts
    );
    expect(tasks).toHaveLength(1);
  });

  test("parses legacy tasks wrapper", () => {
    const tasks = parseTargetTasks(
      { tasks: [{ mkdir: { paths: ["build"] } }] },
      "init",
      artifacts
    );
    expect(tasks).toHaveLength(1);
  });

  test("returns empty list for empty object", () => {
    expect(parseTargetTasks({}, "build", artifacts)).toEqual([]);
  });

  test("rejects legacy clean under target", () => {
    expect(() =>
      parseTargetTasks({ clean: ["compile"] }, "clean", artifacts)
    ).toThrow(/top-level clean/);
  });
});
