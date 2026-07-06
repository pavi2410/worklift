import { describe, test, expect, beforeEach } from "bun:test";
import { writeFileSync, mkdirSync, rmSync } from "fs";
import { join } from "path";
import { getProjectRegistry } from "@worklift/core";
import { loadYamlBuild, resetYamlLoader } from "./load.ts";

const TMP = join(import.meta.dir, ".tmp-yaml-test");

function writeBuild(relativePath: string, content: string): string {
  const filePath = join(TMP, relativePath);
  mkdirSync(join(filePath, ".."), { recursive: true });
  writeFileSync(filePath, content);
  return filePath;
}

describe("loadYamlBuild", () => {
  beforeEach(() => {
    getProjectRegistry().clear();
    resetYamlLoader();
    rmSync(TMP, { recursive: true, force: true });
  });

  test("loads a project with targets and tasks", async () => {
    const file = writeBuild(
      "app/build.yaml",
      `
dependencies:
  build: [init]
targets:
  init:
    - mkdir:
        paths: [build]
  build:
    - copy:
        from: README.md
        to: build/
`
    );

    await loadYamlBuild(file);

    const app = getProjectRegistry().get("app");
    expect(app).toBeDefined();
    expect(app!.targets.has("init")).toBe(true);
    expect(app!.targets.has("build")).toBe(true);
    expect(app!.targets.get("build")!.dependencies).toEqual(["init"]);
  });

  test("auto-creates dependency-only targets", async () => {
    const file = writeBuild(
      "app/build.yaml",
      `
dependencies:
  build: [jar, test]
targets:
  jar:
    - mkdir:
        paths: [build/jar]
  test:
    - mkdir:
        paths: [build/test]
`
    );

    await loadYamlBuild(file);

    const build = getProjectRegistry().get("app")!.targets.get("build")!;
    expect(build.taskList).toHaveLength(0);
    expect(build.dependencies).toHaveLength(2);
  });

  test("resolves cross-project dependencies", async () => {
    writeBuild(
      "lib/build.yaml",
      `
targets:
  jar:
    - mkdir:
        paths: [build]
`
    );

    const root = writeBuild(
      "app/build.yaml",
      `
imports:
  - ../lib/build.yaml
dependencies:
  build: [lib:jar]
targets:
  build:
    - mkdir:
        paths: [dist]
`
    );

    await loadYamlBuild(root);

    const app = getProjectRegistry().get("app");
    const build = app!.targets.get("build")!;
    expect(build.dependencies).toHaveLength(1);
    expect(typeof build.dependencies[0]).toBe("object");
  });

  test("shares artifacts across imported files", async () => {
    writeBuild(
      "lib/build.yaml",
      `
artifacts:
  deps: {}
targets:
  resolve:
    - maven-dep:
        coordinates: [org.json:json:20230227]
        into: $deps
`
    );

    const root = writeBuild(
      "app/build.yaml",
      `
imports:
  - ../lib/build.yaml
targets:
  compile:
    - javac:
        sources: src/Main.java
        destination: build/classes
        classpath: [$deps]
`
    );

    await loadYamlBuild(root);

    const compile = getProjectRegistry().get("app")!.targets.get("compile")!;
    expect(compile.taskList).toHaveLength(1);
  });

  test("creates clean target from top-level clean", async () => {
    const file = writeBuild(
      "app/build.yaml",
      `
clean: [compile]
targets:
  compile:
    - mkdir:
        paths: [build]
`
    );

    await loadYamlBuild(file);

    const app = getProjectRegistry().get("app");
    expect(app!.targets.has("clean")).toBe(true);
  });

  test("deduplicates imported files", async () => {
    writeBuild(
      "lib.yaml",
      `
name: lib
targets:
  build:
    - mkdir:
        paths: [build]
`
    );

    const root = writeBuild(
      "build.yaml",
      `
imports:
  - ./lib.yaml
  - ./lib.yaml
`
    );

    await loadYamlBuild(root);
    expect(getProjectRegistry().size).toBe(1);
  });

  test("infers target dependencies from classpath references", async () => {
    writeBuild(
      "lib/build.yaml",
      `
targets:
  jar:
    - jar:
        from: build/classes
        to: build/lib.jar
`
    );

    const root = writeBuild(
      "app/build.yaml",
      `
imports:
  - ../lib/build.yaml
targets:
  compile:
    - javac:
        sources: src/Main.java
        destination: build/classes
        classpath: [lib:jar]
`
    );

    await loadYamlBuild(root);

    const compile = getProjectRegistry().get("app")!.targets.get("compile")!;
    expect(compile.dependencies).toHaveLength(1);
    expect(typeof compile.dependencies[0]).toBe("object");
  });

  test("rejects unknown dependency references", async () => {
    const file = writeBuild(
      "app/build.yaml",
      `
dependencies:
  build: [other:missing]
targets:
  build:
    - mkdir:
        paths: [build]
`
    );

    await expect(loadYamlBuild(file)).rejects.toThrow("Dependency not found");
  });

  test("rejects target named clean", async () => {
    const file = writeBuild(
      "app/build.yaml",
      `
targets:
  clean:
    - mkdir:
        paths: [build]
`
    );

    await expect(loadYamlBuild(file)).rejects.toThrow('reserved');
  });
});
