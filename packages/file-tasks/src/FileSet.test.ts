import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { FileSet } from "./FileSet.ts";
import { CopyTask } from "./CopyTask.ts";
import { mkdir, writeFile, rm } from "fs/promises";
import { join } from "path";
import { tmpdir } from "os";
import { existsSync } from "fs";

describe("FileSet", () => {
  let testDir: string;

  beforeEach(async () => {
    testDir = join(tmpdir(), `worklift-fileset-test-${Date.now()}`);
    await mkdir(testDir, { recursive: true });
  });

  afterEach(async () => {
    try {
      await rm(testDir, { recursive: true, force: true });
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  describe("Basic functionality", () => {
    test("creates FileSet with dir method", () => {
      const fileSet = FileSet.dir("lib");
      expect(fileSet).toBeInstanceOf(FileSet);
      expect(fileSet.getBaseDir()).toBe("lib");
    });

    test("supports method chaining", () => {
      const fileSet = FileSet.dir("lib")
        .include("**/*.jar")
        .exclude("**/test/**");
      expect(fileSet).toBeInstanceOf(FileSet);
    });

    test("resolves included files", async () => {
      const libDir = join(testDir, "lib");
      await mkdir(libDir, { recursive: true });
      await writeFile(join(libDir, "a.jar"), "");
      await writeFile(join(libDir, "b.jar"), "");
      await writeFile(join(libDir, "c.txt"), "");

      const fileSet = FileSet.dir(libDir).include("**/*.jar");

      const files = await fileSet.resolve();
      expect(files.length).toBe(2);
      expect(files.some(f => f.endsWith("a.jar"))).toBe(true);
      expect(files.some(f => f.endsWith("b.jar"))).toBe(true);
      expect(files.some(f => f.endsWith("c.txt"))).toBe(false);
    });

    test("excludes patterns", async () => {
      const libDir = join(testDir, "lib");
      await mkdir(join(libDir, "test"), { recursive: true });
      await writeFile(join(libDir, "prod.jar"), "");
      await writeFile(join(libDir, "test", "test.jar"), "");

      const fileSet = FileSet.dir(libDir)
        .include("**/*.jar")
        .exclude("**/test/**");

      const files = await fileSet.resolve();
      expect(files.length).toBe(1);
      expect(files[0]).toContain("prod.jar");
      expect(files.some(f => f.includes("test.jar"))).toBe(false);
    });

    test("returns all files when no include pattern specified", async () => {
      const srcDir = join(testDir, "src");
      await mkdir(srcDir, { recursive: true });
      await writeFile(join(srcDir, "file1.txt"), "");
      await writeFile(join(srcDir, "file2.js"), "");

      const fileSet = FileSet.dir(srcDir);
      const files = await fileSet.resolve();

      expect(files.length).toBe(2);
      expect(files.some(f => f.endsWith("file1.txt"))).toBe(true);
      expect(files.some(f => f.endsWith("file2.js"))).toBe(true);
    });

    test("removes duplicates from resolved files", async () => {
      const srcDir = join(testDir, "src");
      await mkdir(srcDir, { recursive: true });
      await writeFile(join(srcDir, "file.txt"), "");

      const fileSet = FileSet.dir(srcDir)
        .include("**/*.txt")
        .include("file.txt");

      const files = await fileSet.resolve();
      expect(files.length).toBe(1);
    });
  });

  describe("matching method", () => {
    test("creates new FileSet with additional pattern", async () => {
      const srcDir = join(testDir, "src");
      await mkdir(srcDir, { recursive: true });
      await writeFile(join(srcDir, "file.txt"), "");
      await writeFile(join(srcDir, "temp.tmp"), "");

      const baseFileSet = FileSet.dir(srcDir).include("**/*.txt");
      const matchedFileSet = baseFileSet.matching("**/*.tmp");

      const baseFiles = await baseFileSet.resolve();
      const matchedFiles = await matchedFileSet.resolve();

      expect(baseFiles.length).toBe(1);
      expect(baseFiles[0]).toContain("file.txt");
      expect(matchedFiles.length).toBe(2);
      expect(matchedFiles.some(f => f.endsWith("file.txt"))).toBe(true);
      expect(matchedFiles.some(f => f.endsWith("temp.tmp"))).toBe(true);
    });

    test("does not modify original FileSet", async () => {
      const srcDir = join(testDir, "src");
      await mkdir(srcDir, { recursive: true });

      const original = FileSet.dir(srcDir).include("**/*.txt");
      const matched = original.matching("**/*.tmp");

      expect(original.getIncludePatterns()).toEqual(["**/*.txt"]);
      expect(matched.getIncludePatterns()).toEqual(["**/*.txt", "**/*.tmp"]);
    });
  });

  describe("union method", () => {
    test("combines multiple file sets", async () => {
      const dir1 = join(testDir, "dir1");
      const dir2 = join(testDir, "dir2");
      await mkdir(dir1, { recursive: true });
      await mkdir(dir2, { recursive: true });
      await writeFile(join(dir1, "file1.jar"), "");
      await writeFile(join(dir1, "file2.txt"), "");

      const fileSet1 = FileSet.dir(dir1).include("**/*.jar");
      const fileSet2 = FileSet.dir(dir1).include("**/*.txt");

      const combined = FileSet.union(fileSet1, fileSet2);
      const files = await combined.resolve();

      expect(files.length).toBe(2);
      expect(files.some(f => f.endsWith("file1.jar"))).toBe(true);
      expect(files.some(f => f.endsWith("file2.txt"))).toBe(true);
    });

    test("combines exclude patterns", async () => {
      const srcDir = join(testDir, "src");
      await mkdir(join(srcDir, "test"), { recursive: true });
      await mkdir(join(srcDir, "prod"), { recursive: true });
      await writeFile(join(srcDir, "test", "test.jar"), "");
      await writeFile(join(srcDir, "prod", "prod.jar"), "");

      const fileSet1 = FileSet.dir(srcDir)
        .include("**/*.jar")
        .exclude("**/test/**");
      const fileSet2 = FileSet.dir(srcDir)
        .include("**/*.jar")
        .exclude("**/prod/**");

      const combined = FileSet.union(fileSet1, fileSet2);
      const files = await combined.resolve();

      // Both test and prod should be excluded
      expect(files.length).toBe(0);
    });

    test("handles empty union", () => {
      const combined = FileSet.union();
      expect(combined).toBeInstanceOf(FileSet);
      expect(combined.getBaseDir()).toBe(".");
    });
  });

  describe("Integration with CopyTask", () => {
    test("works with CopyTask", async () => {
      const srcDir = join(testDir, "src");
      const destDir = join(testDir, "dest");
      await mkdir(srcDir, { recursive: true });
      await writeFile(join(srcDir, "file.txt"), "content");

      const fileSet = FileSet.dir(srcDir).include("**/*.txt");

      await CopyTask.files(fileSet).to(destDir).execute();

      expect(existsSync(join(destDir, "file.txt"))).toBe(true);
    });

    test("preserves directory structure", async () => {
      const srcDir = join(testDir, "src");
      const destDir = join(testDir, "dest");
      await mkdir(join(srcDir, "subdir"), { recursive: true });
      await writeFile(join(srcDir, "file1.txt"), "content1");
      await writeFile(join(srcDir, "subdir", "file2.txt"), "content2");

      const fileSet = FileSet.dir(srcDir).include("**/*.txt");

      await CopyTask.files(fileSet).to(destDir).execute();

      expect(existsSync(join(destDir, "file1.txt"))).toBe(true);
      expect(existsSync(join(destDir, "subdir", "file2.txt"))).toBe(true);
    });

    test("copies only included files", async () => {
      const srcDir = join(testDir, "src");
      const destDir = join(testDir, "dest");
      await mkdir(srcDir, { recursive: true });
      await writeFile(join(srcDir, "include.txt"), "content");
      await writeFile(join(srcDir, "exclude.log"), "content");

      const fileSet = FileSet.dir(srcDir).include("**/*.txt");

      await CopyTask.files(fileSet).to(destDir).execute();

      expect(existsSync(join(destDir, "include.txt"))).toBe(true);
      expect(existsSync(join(destDir, "exclude.log"))).toBe(false);
    });

    test("respects exclude patterns", async () => {
      const srcDir = join(testDir, "src");
      const destDir = join(testDir, "dest");
      await mkdir(join(srcDir, "test"), { recursive: true });
      await writeFile(join(srcDir, "prod.txt"), "content");
      await writeFile(join(srcDir, "test", "test.txt"), "content");

      const fileSet = FileSet.dir(srcDir)
        .include("**/*.txt")
        .exclude("**/test/**");

      await CopyTask.files(fileSet).to(destDir).execute();

      expect(existsSync(join(destDir, "prod.txt"))).toBe(true);
      expect(existsSync(join(destDir, "test", "test.txt"))).toBe(false);
    });

    test("can be reused across multiple tasks", async () => {
      const srcDir = join(testDir, "src");
      const dest1 = join(testDir, "dest1");
      const dest2 = join(testDir, "dest2");
      await mkdir(srcDir, { recursive: true });
      await writeFile(join(srcDir, "file.txt"), "content");

      const fileSet = FileSet.dir(srcDir).include("**/*.txt");

      await CopyTask.files(fileSet).to(dest1).execute();
      await CopyTask.files(fileSet).to(dest2).execute();

      expect(existsSync(join(dest1, "file.txt"))).toBe(true);
      expect(existsSync(join(dest2, "file.txt"))).toBe(true);
    });
  });

  describe("Lazy evaluation", () => {
    test("does not resolve files until needed", () => {
      const fileSet = FileSet.dir("nonexistent")
        .include("**/*.jar")
        .exclude("**/test/**");

      // Should not throw because files aren't resolved yet
      expect(fileSet).toBeInstanceOf(FileSet);
    });

    test("resolves files when resolve() is called", async () => {
      const srcDir = join(testDir, "src");
      await mkdir(srcDir, { recursive: true });
      await writeFile(join(srcDir, "file.txt"), "");

      const fileSet = FileSet.dir(srcDir).include("**/*.txt");

      // Before resolve
      const filesBefore = fileSet.getIncludePatterns();
      expect(filesBefore).toEqual(["**/*.txt"]);

      // After resolve
      const files = await fileSet.resolve();
      expect(files.length).toBe(1);
    });
  });

  describe("Getter methods", () => {
    test("getBaseDir returns base directory", () => {
      const fileSet = FileSet.dir("/path/to/lib");
      expect(fileSet.getBaseDir()).toBe("/path/to/lib");
    });

    test("getIncludePatterns returns include patterns", () => {
      const fileSet = FileSet.dir("lib")
        .include("**/*.jar")
        .include("**/*.zip");
      expect(fileSet.getIncludePatterns()).toEqual(["**/*.jar", "**/*.zip"]);
    });

    test("getExcludePatterns returns exclude patterns", () => {
      const fileSet = FileSet.dir("lib")
        .exclude("**/test/**")
        .exclude("**/debug/**");
      expect(fileSet.getExcludePatterns()).toEqual(["**/test/**", "**/debug/**"]);
    });

    test("getter methods return copies, not references", () => {
      const fileSet = FileSet.dir("lib").include("**/*.jar");
      const patterns1 = fileSet.getIncludePatterns();
      patterns1.push("**/*.zip");
      const patterns2 = fileSet.getIncludePatterns();
      expect(patterns2).toEqual(["**/*.jar"]);
    });
  });
});
