import { describe, test, expect } from "bun:test";
import { JavacTask } from "@worklift/java-tasks";
import { parseJavaDefaults } from "./parseJavaDefaults.ts";
import { parseTask } from "./parseTask.ts";

describe("parseJavaDefaults", () => {
  test("parses source and target shorthand", () => {
    expect(parseJavaDefaults({ source: "11", target: "17" })).toEqual({
      sourceVersion: "11",
      targetVersion: "17",
      encoding: undefined,
    });
  });

  test("parses sourceVersion and targetVersion", () => {
    expect(
      parseJavaDefaults({ sourceVersion: "11", targetVersion: "11", encoding: "UTF-8" })
    ).toEqual({
      sourceVersion: "11",
      targetVersion: "11",
      encoding: "UTF-8",
    });
  });

  test("rejects non-object java block", () => {
    expect(() => parseJavaDefaults("11")).toThrow("java block must be an object");
  });
});

describe("parseTask with java defaults", () => {
  test("applies project defaults to javac", () => {
    const task = parseTask(
      {
        javac: {
          sources: "src/Main.java",
          destination: "build/classes",
        },
      },
      new Map(),
      "app",
      { sourceVersion: "11", targetVersion: "11" }
    );

    expect(task).toBeInstanceOf(JavacTask);
  });

  test("task-level javac config overrides project defaults", () => {
    const task = parseTask(
      {
        javac: {
          sources: "src/Main.java",
          destination: "build/classes",
          sourceVersion: "17",
        },
      },
      new Map(),
      "app",
      { sourceVersion: "11", targetVersion: "11" }
    ) as JavacTask;

    expect((task as unknown as { sourceVer?: string }).sourceVer).toBe("17");
    expect((task as unknown as { targetVer?: string }).targetVer).toBe("11");
  });
});
