import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { CopyTask } from "./CopyTask";
import { mkdirSync, writeFileSync, rmSync, existsSync } from "fs";

describe("CopyTask with includes", () => {
  beforeEach(() => {
    mkdirSync("test-temp/src", { recursive: true });
    mkdirSync("test-temp/src/subdir");
    mkdirSync("test-temp/src/test");
    writeFileSync("test-temp/src/file1.txt", "content1");
    writeFileSync("test-temp/src/file2.ts", "content2");
    writeFileSync("test-temp/src/file3.js", "content3");
    writeFileSync("test-temp/src/file4.bak", "content4");
    writeFileSync("test-temp/src/subdir/file5.txt", "content5");
    writeFileSync("test-temp/src/subdir/file6.ts", "content6");
    writeFileSync("test-temp/src/test/test.txt", "content7");
  });

  afterEach(() => {
    rmSync("test-temp", { recursive: true, force: true });
  });

  test("includes only matching files", async () => {
    await CopyTask.from("test-temp/src")
      .to("test-temp/dest")
      .include("**/*.ts")
      .execute();

    expect(existsSync("test-temp/dest/file1.txt")).toBe(false);
    expect(existsSync("test-temp/dest/file2.ts")).toBe(true);
    expect(existsSync("test-temp/dest/file3.js")).toBe(false);
    expect(existsSync("test-temp/dest/subdir/file6.ts")).toBe(true);
  });

  test("includes multiple patterns", async () => {
    await CopyTask.from("test-temp/src")
      .to("test-temp/dest")
      .include("**/*.ts", "**/*.js")
      .execute();

    expect(existsSync("test-temp/dest/file1.txt")).toBe(false);
    expect(existsSync("test-temp/dest/file2.ts")).toBe(true);
    expect(existsSync("test-temp/dest/file3.js")).toBe(true);
    expect(existsSync("test-temp/dest/file4.bak")).toBe(false);
    expect(existsSync("test-temp/dest/subdir/file6.ts")).toBe(true);
  });

  test("includes with chained calls", async () => {
    await CopyTask.from("test-temp/src")
      .to("test-temp/dest")
      .include("**/*.ts")
      .include("**/*.js")
      .execute();

    expect(existsSync("test-temp/dest/file1.txt")).toBe(false);
    expect(existsSync("test-temp/dest/file2.ts")).toBe(true);
    expect(existsSync("test-temp/dest/file3.js")).toBe(true);
    expect(existsSync("test-temp/dest/subdir/file6.ts")).toBe(true);
  });

  test("includes specific files", async () => {
    await CopyTask.from("test-temp/src")
      .to("test-temp/dest")
      .include("file2.ts", "subdir/file5.txt")
      .execute();

    expect(existsSync("test-temp/dest/file1.txt")).toBe(false);
    expect(existsSync("test-temp/dest/file2.ts")).toBe(true);
    expect(existsSync("test-temp/dest/file3.js")).toBe(false);
    expect(existsSync("test-temp/dest/subdir/file5.txt")).toBe(true);
    expect(existsSync("test-temp/dest/subdir/file6.ts")).toBe(false);
  });

  test("includes from specific directory", async () => {
    await CopyTask.from("test-temp/src")
      .to("test-temp/dest")
      .include("subdir/**")
      .execute();

    expect(existsSync("test-temp/dest/file1.txt")).toBe(false);
    expect(existsSync("test-temp/dest/file2.ts")).toBe(false);
    expect(existsSync("test-temp/dest/subdir/file5.txt")).toBe(true);
    expect(existsSync("test-temp/dest/subdir/file6.ts")).toBe(true);
  });

  test("combines include and exclude patterns", async () => {
    await CopyTask.from("test-temp/src")
      .to("test-temp/dest")
      .include("**/*.txt")
      .exclude("**/test/**")
      .execute();

    expect(existsSync("test-temp/dest/file1.txt")).toBe(true);
    expect(existsSync("test-temp/dest/file2.ts")).toBe(false);
    expect(existsSync("test-temp/dest/subdir/file5.txt")).toBe(true);
    expect(existsSync("test-temp/dest/test/test.txt")).toBe(false);
  });

  test("combines include and exclude with multiple patterns", async () => {
    await CopyTask.from("test-temp/src")
      .to("test-temp/dest")
      .include("**/*.ts", "**/*.js")
      .exclude("**/subdir/**")
      .execute();

    expect(existsSync("test-temp/dest/file1.txt")).toBe(false);
    expect(existsSync("test-temp/dest/file2.ts")).toBe(true);
    expect(existsSync("test-temp/dest/file3.js")).toBe(true);
    expect(existsSync("test-temp/dest/subdir/file6.ts")).toBe(false);
  });

  test("exclude takes precedence over include", async () => {
    await CopyTask.from("test-temp/src")
      .to("test-temp/dest")
      .include("**/*.ts")
      .exclude("**/*.ts")
      .execute();

    expect(existsSync("test-temp/dest/file2.ts")).toBe(false);
    expect(existsSync("test-temp/dest/subdir/file6.ts")).toBe(false);
  });

  test("works with all text files except backups", async () => {
    await CopyTask.from("test-temp/src")
      .to("test-temp/dest")
      .include("**/*.txt", "**/*.ts", "**/*.js")
      .exclude("**/*.bak")
      .execute();

    expect(existsSync("test-temp/dest/file1.txt")).toBe(true);
    expect(existsSync("test-temp/dest/file2.ts")).toBe(true);
    expect(existsSync("test-temp/dest/file3.js")).toBe(true);
    expect(existsSync("test-temp/dest/file4.bak")).toBe(false);
    expect(existsSync("test-temp/dest/subdir/file5.txt")).toBe(true);
    expect(existsSync("test-temp/dest/subdir/file6.ts")).toBe(true);
  });
});
