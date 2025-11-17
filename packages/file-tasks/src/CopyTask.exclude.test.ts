import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { CopyTask } from "./CopyTask";
import { mkdirSync, writeFileSync, rmSync, existsSync } from "fs";

describe("CopyTask with excludes", () => {
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
    await CopyTask.from("test-temp/src")
      .to("test-temp/dest")
      .exclude("file2.tmp")
      .execute();

    expect(existsSync("test-temp/dest/file1.txt")).toBe(true);
    expect(existsSync("test-temp/dest/file2.tmp")).toBe(false);
    expect(existsSync("test-temp/dest/subdir/file3.txt")).toBe(true);
  });

  test("excludes with glob pattern", async () => {
    await CopyTask.from("test-temp/src")
      .to("test-temp/dest")
      .exclude("**/*.tmp")
      .execute();

    expect(existsSync("test-temp/dest/file1.txt")).toBe(true);
    expect(existsSync("test-temp/dest/file2.tmp")).toBe(false);
    expect(existsSync("test-temp/dest/subdir/file3.txt")).toBe(true);
    expect(existsSync("test-temp/dest/subdir/file4.tmp")).toBe(false);
  });

  test("excludes multiple patterns", async () => {
    await CopyTask.from("test-temp/src")
      .to("test-temp/dest")
      .exclude("**/*.tmp", "**/subdir/**")
      .execute();

    expect(existsSync("test-temp/dest/file1.txt")).toBe(true);
    expect(existsSync("test-temp/dest/file2.tmp")).toBe(false);
    expect(existsSync("test-temp/dest/subdir/file3.txt")).toBe(false);
  });

  test("excludes with chained calls", async () => {
    await CopyTask.from("test-temp/src")
      .to("test-temp/dest")
      .exclude("**/*.tmp")
      .exclude("**/*.bak")
      .execute();

    expect(existsSync("test-temp/dest/file1.txt")).toBe(true);
    expect(existsSync("test-temp/dest/file2.tmp")).toBe(false);
    expect(existsSync("test-temp/dest/file3.bak")).toBe(false);
    expect(existsSync("test-temp/dest/subdir/file3.txt")).toBe(true);
  });

  test("excludes directory with wildcard", async () => {
    await CopyTask.from("test-temp/src")
      .to("test-temp/dest")
      .exclude("**/test/**")
      .execute();

    expect(existsSync("test-temp/dest/file1.txt")).toBe(true);
    expect(existsSync("test-temp/dest/test/test.txt")).toBe(false);
  });

  test("works without excludes (backward compatibility)", async () => {
    await CopyTask.from("test-temp/src")
      .to("test-temp/dest")
      .execute();

    expect(existsSync("test-temp/dest/file1.txt")).toBe(true);
    expect(existsSync("test-temp/dest/file2.tmp")).toBe(true);
    expect(existsSync("test-temp/dest/subdir/file3.txt")).toBe(true);
    expect(existsSync("test-temp/dest/subdir/file4.tmp")).toBe(true);
  });

  test("excludes specific file in subdirectory", async () => {
    await CopyTask.from("test-temp/src")
      .to("test-temp/dest")
      .exclude("subdir/file3.txt")
      .execute();

    expect(existsSync("test-temp/dest/file1.txt")).toBe(true);
    expect(existsSync("test-temp/dest/subdir/file3.txt")).toBe(false);
    expect(existsSync("test-temp/dest/subdir/file4.tmp")).toBe(true);
  });

  test("excludes with multiple wildcards", async () => {
    await CopyTask.from("test-temp/src")
      .to("test-temp/dest")
      .exclude("**/*.tmp", "**/*.bak", "**/test/**")
      .execute();

    expect(existsSync("test-temp/dest/file1.txt")).toBe(true);
    expect(existsSync("test-temp/dest/file2.tmp")).toBe(false);
    expect(existsSync("test-temp/dest/file3.bak")).toBe(false);
    expect(existsSync("test-temp/dest/subdir/file3.txt")).toBe(true);
    expect(existsSync("test-temp/dest/subdir/file4.tmp")).toBe(false);
    expect(existsSync("test-temp/dest/test/test.txt")).toBe(false);
  });
});
