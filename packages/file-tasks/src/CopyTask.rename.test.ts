import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { CopyTask } from "./CopyTask";
import { FileSet } from "@worklift/core";
import { mkdirSync, writeFileSync, rmSync, existsSync, readFileSync } from "fs";

describe("CopyTask rename", () => {
  beforeEach(() => {
    rmSync("test-temp", { recursive: true, force: true });
  });

  afterEach(() => {
    rmSync("test-temp", { recursive: true, force: true });
  });

  test("strips version numbers from JARs", async () => {
    mkdirSync("test-temp/lib", { recursive: true });
    writeFileSync("test-temp/lib/guava-20.0.jar", "guava content");
    writeFileSync("test-temp/lib/gson-2.8.5.jar", "gson content");

    await CopyTask.of({
      from: "test-temp/lib/*.jar",
      to: "test-temp/build",
      rename: { pattern: /^([-a-z0-9]*)-[\d.]*\.jar$/, replacement: "$1.jar" },
    }).execute();

    expect(existsSync("test-temp/build/guava.jar")).toBe(true);
    expect(existsSync("test-temp/build/gson.jar")).toBe(true);
    expect(existsSync("test-temp/build/guava-20.0.jar")).toBe(false);
    expect(readFileSync("test-temp/build/guava.jar", "utf-8")).toBe("guava content");
    expect(readFileSync("test-temp/build/gson.jar", "utf-8")).toBe("gson content");
  });

  test("changes file extensions", async () => {
    mkdirSync("test-temp/src", { recursive: true });
    writeFileSync("test-temp/src/index.ts", "index content");
    writeFileSync("test-temp/src/utils.ts", "utils content");

    await CopyTask.of({
      from: "test-temp/src/*.ts",
      to: "test-temp/build",
      rename: { pattern: /\.ts$/, replacement: ".js" },
    }).execute();

    expect(existsSync("test-temp/build/index.js")).toBe(true);
    expect(existsSync("test-temp/build/utils.js")).toBe(true);
    expect(existsSync("test-temp/build/index.ts")).toBe(false);
    expect(readFileSync("test-temp/build/index.js", "utf-8")).toBe("index content");
  });

  test("handles complex transformation with capture groups", async () => {
    mkdirSync("test-temp/resources", { recursive: true });
    writeFileSync("test-temp/resources/database.template", "db config");
    writeFileSync("test-temp/resources/server.template", "server config");

    await CopyTask.of({
      from: "test-temp/resources/*.template",
      to: "test-temp/config",
      rename: { pattern: /^(.*)\.template$/, replacement: "config.$1.xml" },
    }).execute();

    expect(existsSync("test-temp/config/config.database.xml")).toBe(true);
    expect(existsSync("test-temp/config/config.server.xml")).toBe(true);
    expect(existsSync("test-temp/config/database.template")).toBe(false);
  });

  test("works with recursive patterns", async () => {
    mkdirSync("test-temp/src/subdir", { recursive: true });
    writeFileSync("test-temp/src/file1.ts", "content1");
    writeFileSync("test-temp/src/subdir/file2.ts", "content2");

    await CopyTask.of({
      from: "test-temp/src/**/*.ts",
      to: "test-temp/build",
      rename: { pattern: /\.ts$/, replacement: ".js" },
    }).execute();

    expect(existsSync("test-temp/build/file1.js")).toBe(true);
    expect(existsSync("test-temp/build/subdir/file2.js")).toBe(true);
    expect(existsSync("test-temp/build/file1.ts")).toBe(false);
    expect(existsSync("test-temp/build/subdir/file2.ts")).toBe(false);
  });

  test("combines rename with include patterns using FileSet", async () => {
    mkdirSync("test-temp/lib", { recursive: true });
    writeFileSync("test-temp/lib/lib-a-1.0.jar", "content a");
    writeFileSync("test-temp/lib/lib-b-2.0.jar", "content b");
    writeFileSync("test-temp/lib/readme.txt", "readme");

    // Use glob pattern directly in from() for simple cases
    await CopyTask.of({
      from: "test-temp/lib/*.jar",
      to: "test-temp/build",
      rename: { pattern: /^(.*)-[\d.]*\.jar$/, replacement: "$1.jar" },
    }).execute();

    expect(existsSync("test-temp/build/lib-a.jar")).toBe(true);
    expect(existsSync("test-temp/build/lib-b.jar")).toBe(true);
    expect(existsSync("test-temp/build/readme.txt")).toBe(false);
  });

  test("combines rename with exclude patterns using FileSet", async () => {
    mkdirSync("test-temp/src/test", { recursive: true });
    writeFileSync("test-temp/src/app.ts", "app content");
    writeFileSync("test-temp/src/test/app.test.ts", "test content");

    // Use FileSet for complex include/exclude scenarios
    const fileSet = FileSet.dir("test-temp/src")
      .include("**/*.ts")
      .exclude("**/test/**");

    await CopyTask.of({
      files: fileSet,
      to: "test-temp/build",
      rename: { pattern: /\.ts$/, replacement: ".js" },
    }).execute();

    expect(existsSync("test-temp/build/app.js")).toBe(true);
    expect(existsSync("test-temp/build/test/app.test.js")).toBe(false);
  });

  test("handles files that don't match rename pattern", async () => {
    mkdirSync("test-temp/lib", { recursive: true });
    writeFileSync("test-temp/lib/versioned-1.0.jar", "versioned");
    writeFileSync("test-temp/lib/noversion.jar", "noversion");

    await CopyTask.of({
      from: "test-temp/lib/*.jar",
      to: "test-temp/build",
      rename: { pattern: /^(.*)-[\d.]*\.jar$/, replacement: "$1.jar" },
    }).execute();

    expect(existsSync("test-temp/build/versioned.jar")).toBe(true);
    expect(existsSync("test-temp/build/noversion.jar")).toBe(true);
    expect(readFileSync("test-temp/build/versioned.jar", "utf-8")).toBe("versioned");
    expect(readFileSync("test-temp/build/noversion.jar", "utf-8")).toBe("noversion");
  });

  test("handles multiple capture groups", async () => {
    mkdirSync("test-temp/src", { recursive: true });
    writeFileSync("test-temp/src/component-v1-beta.tsx", "content");

    await CopyTask.of({
      from: "test-temp/src/*.tsx",
      to: "test-temp/build",
      rename: { pattern: /^(.*)-v(\d+)-(.*)\.tsx$/, replacement: "$1.$2.$3.js" },
    }).execute();

    expect(existsSync("test-temp/build/component.1.beta.js")).toBe(true);
  });

  test("preserves directory structure with rename", async () => {
    mkdirSync("test-temp/src/components", { recursive: true });
    mkdirSync("test-temp/src/utils", { recursive: true });
    writeFileSync("test-temp/src/components/Button.ts", "button");
    writeFileSync("test-temp/src/utils/helpers.ts", "helpers");

    await CopyTask.of({
      from: "test-temp/src/**/*.ts",
      to: "test-temp/build",
      rename: { pattern: /\.ts$/, replacement: ".js" },
    }).execute();

    expect(existsSync("test-temp/build/components/Button.js")).toBe(true);
    expect(existsSync("test-temp/build/utils/helpers.js")).toBe(true);
  });

  test("handles empty replacement string", async () => {
    mkdirSync("test-temp/src", { recursive: true });
    writeFileSync("test-temp/src/file.backup.txt", "content");

    await CopyTask.of({
      from: "test-temp/src/*.txt",
      to: "test-temp/build",
      rename: { pattern: /\.backup/, replacement: "" },
    }).execute();

    expect(existsSync("test-temp/build/file.txt")).toBe(true);
    expect(existsSync("test-temp/build/file.backup.txt")).toBe(false);
  });
});
