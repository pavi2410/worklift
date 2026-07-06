import { describe, test, expect } from "bun:test";
import { parseTargetTasks } from "./parseTarget.ts";
import type { TaskParseContext } from "./taskParseContext.ts";

describe("parseTargetTasks", () => {
  const ctx: TaskParseContext = {
    artifacts: new Map(),
    projectName: "app",
    variants: new Map(),
  };

  test("parses direct task list", () => {
    const tasks = parseTargetTasks(
      [{ mkdir: { paths: ["build"] } }],
      "init",
      ctx
    );
    expect(tasks).toHaveLength(1);
  });

  test("parses legacy tasks wrapper", () => {
    const tasks = parseTargetTasks(
      { tasks: [{ mkdir: { paths: ["build"] } }] },
      "init",
      ctx
    );
    expect(tasks).toHaveLength(1);
  });

  test("returns empty list for empty object", () => {
    expect(parseTargetTasks({}, "build", ctx)).toEqual([]);
  });

  test("rejects legacy clean under target", () => {
    expect(() =>
      parseTargetTasks({ clean: ["compile"] }, "clean", ctx)
    ).toThrow(/top-level clean/);
  });
});
