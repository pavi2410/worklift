import { describe, test, expect, beforeEach } from "bun:test";
import { getProjectRegistry, project, isTarget } from "@worklift/core";
import { JarTask } from "@worklift/java-tasks";
import { resolveVariants } from "./parseVariants.ts";
import {
  parseClasspath,
  resolveTargetClasspathRef,
} from "./parseClasspath.ts";

describe("parseClasspath", () => {
  beforeEach(() => {
    getProjectRegistry().clear();
  });

  test("resolves cross-project target reference", () => {
    const lib = project("lib");
    lib.target({
      name: "jar",
      tasks: [JarTask.of({ from: "build/classes", to: "build/lib.jar" })],
    });

    const refs = parseClasspath(["lib:jar"], new Map(), "app");
    expect(refs).toHaveLength(1);
    expect(isTarget(refs[0])).toBe(true);
    expect((refs[0] as { name: string }).name).toBe("jar");
  });

  test("resolves local target name", () => {
    const app = project("app");
    app.target({
      name: "compile",
      tasks: [JarTask.of({ from: "build/classes", to: "build/classes" })],
    });

    expect(resolveTargetClasspathRef("compile", "app")?.name).toBe("compile");
  });

  test("treats unknown single-segment names as paths", () => {
    expect(resolveTargetClasspathRef("build/classes", "app")).toBeUndefined();
    const refs = parseClasspath(["build/classes"], new Map(), "app");
    expect(refs[0]).toBe("build/classes");
  });

  test("resolves variant references on classpath", () => {
    const variants = resolveVariants({ layout: "maven" }, { main: {}, test: {} });
    const refs = parseClasspath(["main"], new Map(), "app", variants);
    expect(refs[0]).toBe("build/classes");
  });

  test("throws for unknown project:target reference", () => {
    expect(() => parseClasspath(["missing:jar"], new Map(), "app")).toThrow(
      "Unknown target classpath reference"
    );
  });
});
