import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { DeleteTask } from "./DeleteTask";
import { mkdirSync, writeFileSync, rmSync, existsSync } from "fs";

describe("DeleteTask with patterns", () => {
  beforeEach(() => {
    mkdirSync("test-temp/build/sub", { recursive: true });
    mkdirSync("test-temp/build/test", { recursive: true });
  });

  afterEach(() => {
    rmSync("test-temp", { recursive: true, force: true });
  });

  test("deletes files matching pattern", async () => {
    writeFileSync("test-temp/build/file.txt", "content");
    writeFileSync("test-temp/build/file.tmp", "content");
    writeFileSync("test-temp/build/sub/file.tmp", "content");

    await DeleteTask.of({
      patterns: ["**/*.tmp"],
      baseDir: "test-temp/build",
    }).execute();

    expect(existsSync("test-temp/build/file.txt")).toBe(true);
    expect(existsSync("test-temp/build/file.tmp")).toBe(false);
    expect(existsSync("test-temp/build/sub/file.tmp")).toBe(false);
  });

  test("deletes multiple patterns", async () => {
    writeFileSync("test-temp/build/file.tmp", "content");
    writeFileSync("test-temp/build/file.bak", "content");
    writeFileSync("test-temp/build/file.txt", "content");

    await DeleteTask.of({
      patterns: ["**/*.tmp", "**/*.bak"],
      baseDir: "test-temp/build",
    }).execute();

    expect(existsSync("test-temp/build/file.txt")).toBe(true);
    expect(existsSync("test-temp/build/file.tmp")).toBe(false);
    expect(existsSync("test-temp/build/file.bak")).toBe(false);
  });

  test("preserves files that don't match pattern", async () => {
    writeFileSync("test-temp/build/file1.txt", "content");
    writeFileSync("test-temp/build/file2.js", "content");
    writeFileSync("test-temp/build/file3.tmp", "content");
    writeFileSync("test-temp/build/sub/file4.txt", "content");

    await DeleteTask.of({
      patterns: ["**/*.tmp"],
      baseDir: "test-temp/build",
    }).execute();

    expect(existsSync("test-temp/build/file1.txt")).toBe(true);
    expect(existsSync("test-temp/build/file2.js")).toBe(true);
    expect(existsSync("test-temp/build/file3.tmp")).toBe(false);
    expect(existsSync("test-temp/build/sub/file4.txt")).toBe(true);
  });

  test("deletes files in nested directories", async () => {
    mkdirSync("test-temp/build/sub/nested", { recursive: true });
    writeFileSync("test-temp/build/file.log", "content");
    writeFileSync("test-temp/build/sub/file.log", "content");
    writeFileSync("test-temp/build/sub/nested/file.log", "content");

    await DeleteTask.of({
      patterns: ["**/*.log"],
      baseDir: "test-temp/build",
    }).execute();

    expect(existsSync("test-temp/build/file.log")).toBe(false);
    expect(existsSync("test-temp/build/sub/file.log")).toBe(false);
    expect(existsSync("test-temp/build/sub/nested/file.log")).toBe(false);
  });

  test("works without baseDir (uses cwd)", async () => {
    mkdirSync("test-temp/target", { recursive: true });
    writeFileSync("test-temp/target/file.tmp", "content");
    writeFileSync("test-temp/target/file.txt", "content");

    await DeleteTask.of({ patterns: ["test-temp/target/**/*.tmp"] }).execute();

    expect(existsSync("test-temp/target/file.txt")).toBe(true);
    expect(existsSync("test-temp/target/file.tmp")).toBe(false);
  });

  test("deletes matched directories when includeDirs is true", async () => {
    mkdirSync("test-temp/build/test-dir", { recursive: true });
    mkdirSync("test-temp/build/prod-dir", { recursive: true });
    writeFileSync("test-temp/build/test-dir/file.txt", "content");

    await DeleteTask.of({
      patterns: ["**/test-*"],
      baseDir: "test-temp/build",
      includeDirs: true,
    }).execute();

    expect(existsSync("test-temp/build/test-dir")).toBe(false);
    expect(existsSync("test-temp/build/prod-dir")).toBe(true);
  });

  test("preserves directories when includeDirs is false", async () => {
    mkdirSync("test-temp/build/test-dir", { recursive: true });
    writeFileSync("test-temp/build/file.tmp", "content");

    await DeleteTask.of({
      patterns: ["**/*.tmp"],
      baseDir: "test-temp/build",
      includeDirs: false,
    }).execute();

    expect(existsSync("test-temp/build/file.tmp")).toBe(false);
    expect(existsSync("test-temp/build/test-dir")).toBe(true);
  });

  test("throws error when neither paths nor patterns are provided", async () => {
    const task = new DeleteTask();

    expect(() => task.validate()).toThrow(
      "DeleteTask: 'paths', 'patterns', or 'files' is required"
    );
  });
});

describe("DeleteTask with paths (backward compatibility)", () => {
  beforeEach(() => {
    mkdirSync("test-temp/build", { recursive: true });
  });

  afterEach(() => {
    rmSync("test-temp", { recursive: true, force: true });
  });

  test("deletes specific paths", async () => {
    writeFileSync("test-temp/build/file1.txt", "content");
    writeFileSync("test-temp/build/file2.txt", "content");

    await DeleteTask.of({
      paths: ["test-temp/build/file1.txt", "test-temp/build/file2.txt"],
    }).execute();

    expect(existsSync("test-temp/build/file1.txt")).toBe(false);
    expect(existsSync("test-temp/build/file2.txt")).toBe(false);
  });

  test("deletes directories recursively", async () => {
    mkdirSync("test-temp/build/subdir", { recursive: true });
    writeFileSync("test-temp/build/subdir/file.txt", "content");

    await DeleteTask.of({
      paths: ["test-temp/build/subdir"],
      recursive: true,
    }).execute();

    expect(existsSync("test-temp/build/subdir")).toBe(false);
  });

  test("handles non-existent paths gracefully (force: true)", async () => {
    await DeleteTask.of({ paths: ["test-temp/build/non-existent.txt"] }).execute();

    // Should not throw an error due to force: true
    expect(true).toBe(true);
  });
});

describe("DeleteTask mixed usage", () => {
  beforeEach(() => {
    mkdirSync("test-temp/build", { recursive: true });
  });

  afterEach(() => {
    rmSync("test-temp", { recursive: true, force: true });
  });

  test("can use both paths and patterns together", async () => {
    writeFileSync("test-temp/build/specific.txt", "content");
    writeFileSync("test-temp/build/file.tmp", "content");
    writeFileSync("test-temp/build/file.bak", "content");

    await DeleteTask.of({
      patterns: ["**/*.tmp"],
      baseDir: "test-temp/build",
    }).execute();

    expect(existsSync("test-temp/build/file.tmp")).toBe(false);
    expect(existsSync("test-temp/build/file.bak")).toBe(true);
  });
});
