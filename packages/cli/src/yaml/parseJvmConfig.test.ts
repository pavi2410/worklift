import { describe, test, expect } from "bun:test";
import { Artifact } from "@worklift/core";
import { JavacTask, JUnitTask } from "@worklift/java-tasks";
import { parseJvmConfig } from "./parseJvmConfig.ts";
import { resolveVariants } from "./parseVariants.ts";
import { parseTask } from "./parseTask.ts";
import type { TaskParseContext } from "./taskParseContext.ts";

describe("parseJvmConfig", () => {
  test("parses jvm block with layout", () => {
    expect(
      parseJvmConfig({ jvm: { source: "11", target: "17", layout: "maven" } })
    ).toEqual({
      sourceVersion: "11",
      targetVersion: "17",
      encoding: undefined,
      layout: "maven",
      jdk: undefined,
    });
  });

  test("accepts java as alias for jvm", () => {
    expect(parseJvmConfig({ java: { source: "11" } })?.sourceVersion).toBe(
      "11"
    );
  });

  test("rejects non-object jvm block", () => {
    expect(() => parseJvmConfig({ jvm: "11" })).toThrow(
      "jvm block must be an object"
    );
  });
});

describe("parseTask with variants", () => {
  const artifacts = new Map<string, Artifact<string[]>>();
  artifacts.set("junitClasspath", Artifact.of<string[]>());

  const variants = resolveVariants(
    { layout: "maven", sourceVersion: "11", targetVersion: "11" },
    {
      main: {},
      test: { deps: ["main", "$junitClasspath"] },
    }
  );

  const ctx: TaskParseContext = {
    artifacts,
    projectName: "app",
    jvm: { sourceVersion: "11", targetVersion: "11", layout: "maven" },
    variants,
  };

  test("parses javac variant shorthand", () => {
    const task = parseTask({ javac: "main" }, ctx);
    expect(task).toBeInstanceOf(JavacTask);
    expect((task as JavacTask).inputs).toBe("src/main/java/**/*.java");
    expect((task as JavacTask).outputs).toBe("build/classes");
  });

  test("parses junit with variant testClasses and inherited classpath", () => {
    const task = parseTask(
      {
        junit: {
          testClasses: "test",
          reports: "build/reports",
          version: 5,
        },
      },
      ctx
    );
    expect(task).toBeInstanceOf(JUnitTask);
    expect((task as JUnitTask).outputs).toBe("build/reports");
  });

  test("task-level javac config overrides jvm defaults", () => {
    const task = parseTask(
      {
        javac: {
          sources: "src/Main.java",
          destination: "build/classes",
          sourceVersion: "17",
        },
      },
      ctx
    ) as JavacTask;

    expect((task as unknown as { sourceVer?: string }).sourceVer).toBe("17");
    expect((task as unknown as { targetVer?: string }).targetVer).toBe("11");
  });
});
