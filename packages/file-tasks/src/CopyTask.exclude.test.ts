import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { CopyTask } from "./CopyTask";
import { FileSet } from "@worklift/core";
import { mkdirSync, writeFileSync, rmSync, existsSync } from "fs";

describe("CopyTask with FileSet excludes", () => {
  beforeEach(() => {
    mkdirSync("test-temp/src", { recursive: true });
    mkdirSync("test-temp/src/subdir");
    mkdirSync("test-temp/src/test");
    writeFileSync("test-temp/src/file1.txt", "content1");
    writeFileSync("test-temp/src/file2.tmp", "content2");
    writeFileSync("test-temp/src/file3.bak", "content3");
    writeFileSync("test-temp/src/subdir/file3.txt", "content4");
    writeFileSync("test-temp/src/subdir/file4.tmp", "content5");
    writeFileSync("test-temp/src/test/test.txt", "content6");
  });

  afterEach(() => {
    rmSync("test-temp", { recursive: true, force: true });
  });

  test("excludes single file", async () => {
    const fileSet = FileSet.dir("test-temp/src").exclude("file2.tmp");
    await CopyTask.of({ files: fileSet, to: "test-temp/dest" }).execute();

    expect(existsSync("test-temp/dest/file1.txt")).toBe(true);
    expect(existsSync("test-temp/dest/file2.tmp")).toBe(false);
    expect(existsSync("test-temp/dest/subdir/file3.txt")).toBe(true);
  });

  test("excludes with glob pattern", async () => {
    const fileSet = FileSet.dir("test-temp/src").exclude("**/*.tmp");
    await CopyTask.of({ files: fileSet, to: "test-temp/dest" }).execute();

    expect(existsSync("test-temp/dest/file1.txt")).toBe(true);
    expect(existsSync("test-temp/dest/file2.tmp")).toBe(false);
    expect(existsSync("test-temp/dest/subdir/file3.txt")).toBe(true);
    expect(existsSync("test-temp/dest/subdir/file4.tmp")).toBe(false);
  });

  test("excludes multiple patterns", async () => {
    const fileSet = FileSet.dir("test-temp/src").exclude("**/*.tmp", "**/subdir/**");
    await CopyTask.of({ files: fileSet, to: "test-temp/dest" }).execute();

    expect(existsSync("test-temp/dest/file1.txt")).toBe(true);
    expect(existsSync("test-temp/dest/file2.tmp")).toBe(false);
    expect(existsSync("test-temp/dest/subdir/file3.txt")).toBe(false);
  });

  test("excludes with chained calls", async () => {
    const fileSet = FileSet.dir("test-temp/src")
      .exclude("**/*.tmp")
      .exclude("**/*.bak");
    await CopyTask.of({ files: fileSet, to: "test-temp/dest" }).execute();

    expect(existsSync("test-temp/dest/file1.txt")).toBe(true);
    expect(existsSync("test-temp/dest/file2.tmp")).toBe(false);
    expect(existsSync("test-temp/dest/file3.bak")).toBe(false);
    expect(existsSync("test-temp/dest/subdir/file3.txt")).toBe(true);
  });

  test("excludes directory with wildcard", async () => {
    const fileSet = FileSet.dir("test-temp/src").exclude("**/test/**");
    await CopyTask.of({ files: fileSet, to: "test-temp/dest" }).execute();

    expect(existsSync("test-temp/dest/file1.txt")).toBe(true);
    expect(existsSync("test-temp/dest/test/test.txt")).toBe(false);
  });

  test("works without excludes (backward compatibility)", async () => {
    await CopyTask.of({ from: "test-temp/src", to: "test-temp/dest" }).execute();

    expect(existsSync("test-temp/dest/file1.txt")).toBe(true);
    expect(existsSync("test-temp/dest/file2.tmp")).toBe(true);
    expect(existsSync("test-temp/dest/subdir/file3.txt")).toBe(true);
    expect(existsSync("test-temp/dest/subdir/file4.tmp")).toBe(true);
  });

  test("excludes specific file in subdirectory", async () => {
    const fileSet = FileSet.dir("test-temp/src").exclude("subdir/file3.txt");
    await CopyTask.of({ files: fileSet, to: "test-temp/dest" }).execute();

    expect(existsSync("test-temp/dest/file1.txt")).toBe(true);
    expect(existsSync("test-temp/dest/subdir/file3.txt")).toBe(false);
    expect(existsSync("test-temp/dest/subdir/file4.tmp")).toBe(true);
  });

  test("excludes with multiple wildcards", async () => {
    const fileSet = FileSet.dir("test-temp/src")
      .exclude("**/*.tmp", "**/*.bak", "**/test/**");
    await CopyTask.of({ files: fileSet, to: "test-temp/dest" }).execute();

    expect(existsSync("test-temp/dest/file1.txt")).toBe(true);
    expect(existsSync("test-temp/dest/file2.tmp")).toBe(false);
    expect(existsSync("test-temp/dest/file3.bak")).toBe(false);
    expect(existsSync("test-temp/dest/subdir/file3.txt")).toBe(true);
    expect(existsSync("test-temp/dest/subdir/file4.tmp")).toBe(false);
    expect(existsSync("test-temp/dest/test/test.txt")).toBe(false);
  });
});
