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
    tasks:
      - mkdir:
          paths: [build]
  build:
    tasks:
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

  test("resolves cross-project dependencies", async () => {
    writeBuild(
      "lib/build.yaml",
      `
targets:
  jar:
    tasks:
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
    tasks:
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
    tasks:
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
    tasks:
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

  test("creates clean targets", async () => {
    const file = writeBuild(
      "app/build.yaml",
      `
targets:
  compile:
    tasks:
      - mkdir:
          paths: [build]
  clean:
    clean: [compile]
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
    tasks:
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

  test("rejects dependencies for unknown targets", async () => {
    const file = writeBuild(
      "app/build.yaml",
      `
dependencies:
  missing: [init]
targets:
  init:
    tasks:
      - mkdir:
          paths: [build]
`
    );

    await expect(loadYamlBuild(file)).rejects.toThrow(
      "Dependency target not found"
    );
  });
});
