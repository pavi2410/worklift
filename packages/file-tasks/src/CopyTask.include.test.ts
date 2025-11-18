import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { CopyTask } from "./CopyTask";
import { FileSet } from "./FileSet";
import { mkdirSync, writeFileSync, rmSync, existsSync } from "fs";

describe("CopyTask with FileSet includes", () => {
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
    const fileSet = FileSet.dir("test-temp/src").include("**/*.ts");
    await CopyTask.files(fileSet).to("test-temp/dest").execute();

    expect(existsSync("test-temp/dest/file1.txt")).toBe(false);
    expect(existsSync("test-temp/dest/file2.ts")).toBe(true);
    expect(existsSync("test-temp/dest/file3.js")).toBe(false);
    expect(existsSync("test-temp/dest/subdir/file6.ts")).toBe(true);
  });

  test("includes multiple patterns", async () => {
    const fileSet = FileSet.dir("test-temp/src").include("**/*.ts", "**/*.js");
    await CopyTask.files(fileSet).to("test-temp/dest").execute();

    expect(existsSync("test-temp/dest/file1.txt")).toBe(false);
    expect(existsSync("test-temp/dest/file2.ts")).toBe(true);
    expect(existsSync("test-temp/dest/file3.js")).toBe(true);
    expect(existsSync("test-temp/dest/file4.bak")).toBe(false);
    expect(existsSync("test-temp/dest/subdir/file6.ts")).toBe(true);
  });

  test("includes with chained calls", async () => {
    const fileSet = FileSet.dir("test-temp/src")
      .include("**/*.ts")
      .include("**/*.js");
    await CopyTask.files(fileSet).to("test-temp/dest").execute();

    expect(existsSync("test-temp/dest/file1.txt")).toBe(false);
    expect(existsSync("test-temp/dest/file2.ts")).toBe(true);
    expect(existsSync("test-temp/dest/file3.js")).toBe(true);
    expect(existsSync("test-temp/dest/subdir/file6.ts")).toBe(true);
  });

  test("includes specific files", async () => {
    const fileSet = FileSet.dir("test-temp/src").include("file2.ts", "subdir/file5.txt");
    await CopyTask.files(fileSet).to("test-temp/dest").execute();

    expect(existsSync("test-temp/dest/file1.txt")).toBe(false);
    expect(existsSync("test-temp/dest/file2.ts")).toBe(true);
    expect(existsSync("test-temp/dest/file3.js")).toBe(false);
    expect(existsSync("test-temp/dest/subdir/file5.txt")).toBe(true);
    expect(existsSync("test-temp/dest/subdir/file6.ts")).toBe(false);
  });

  test("includes from specific directory", async () => {
    const fileSet = FileSet.dir("test-temp/src").include("subdir/**");
    await CopyTask.files(fileSet).to("test-temp/dest").execute();

    expect(existsSync("test-temp/dest/file1.txt")).toBe(false);
    expect(existsSync("test-temp/dest/file2.ts")).toBe(false);
    expect(existsSync("test-temp/dest/subdir/file5.txt")).toBe(true);
    expect(existsSync("test-temp/dest/subdir/file6.ts")).toBe(true);
  });

  test("combines include and exclude patterns", async () => {
    const fileSet = FileSet.dir("test-temp/src")
      .include("**/*.txt")
      .exclude("**/test/**");
    await CopyTask.files(fileSet).to("test-temp/dest").execute();

    expect(existsSync("test-temp/dest/file1.txt")).toBe(true);
    expect(existsSync("test-temp/dest/file2.ts")).toBe(false);
    expect(existsSync("test-temp/dest/subdir/file5.txt")).toBe(true);
    expect(existsSync("test-temp/dest/test/test.txt")).toBe(false);
  });

  test("combines include and exclude with multiple patterns", async () => {
    const fileSet = FileSet.dir("test-temp/src")
      .include("**/*.ts", "**/*.js")
      .exclude("**/subdir/**");
    await CopyTask.files(fileSet).to("test-temp/dest").execute();

    expect(existsSync("test-temp/dest/file1.txt")).toBe(false);
    expect(existsSync("test-temp/dest/file2.ts")).toBe(true);
    expect(existsSync("test-temp/dest/file3.js")).toBe(true);
    expect(existsSync("test-temp/dest/subdir/file6.ts")).toBe(false);
  });

  test("exclude takes precedence over include", async () => {
    const fileSet = FileSet.dir("test-temp/src")
      .include("**/*.ts")
      .exclude("**/*.ts");
    await CopyTask.files(fileSet).to("test-temp/dest").execute();

    expect(existsSync("test-temp/dest/file2.ts")).toBe(false);
    expect(existsSync("test-temp/dest/subdir/file6.ts")).toBe(false);
  });

  test("works with all text files except backups", async () => {
    const fileSet = FileSet.dir("test-temp/src")
      .include("**/*.txt", "**/*.ts", "**/*.js")
      .exclude("**/*.bak");
    await CopyTask.files(fileSet).to("test-temp/dest").execute();

    expect(existsSync("test-temp/dest/file1.txt")).toBe(true);
    expect(existsSync("test-temp/dest/file2.ts")).toBe(true);
    expect(existsSync("test-temp/dest/file3.js")).toBe(true);
    expect(existsSync("test-temp/dest/file4.bak")).toBe(false);
    expect(existsSync("test-temp/dest/subdir/file5.txt")).toBe(true);
    expect(existsSync("test-temp/dest/subdir/file6.ts")).toBe(true);
  });
});
