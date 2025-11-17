import { Task } from "@worklift/core";
import { cp, mkdir, copyFile } from "fs/promises";
import { basename, relative, join, dirname } from "path";
import { glob } from "glob";
import { minimatch } from "minimatch";
import { FileSet } from "./FileSet.ts";

/**
 * Task for copying files or directories
 */
export class CopyTask extends Task {
  private fromPath?: string;
  private fileSet?: FileSet;
  private toPath?: string;
  private recursiveFlag = true;
  private forceFlag = true;
  private flattenFlag = false;
  private includePatterns: string[] = [];
  private excludePatterns: string[] = [];
  private renamePattern?: RegExp;
  private renameReplacement?: string;

  inputs?: string | string[];
  outputs?: string | string[];

  static from(path: string): CopyTask {
    const task = new CopyTask();
    task.fromPath = path;
    task.inputs = path;
    return task;
  }

  static files(fileSet: FileSet): CopyTask {
    const task = new CopyTask();
    task.fileSet = fileSet;
    return task;
  }

  to(path: string): this {
    this.toPath = path;
    this.outputs = path;
    return this;
  }

  recursive(value: boolean): this {
    this.recursiveFlag = value;
    return this;
  }

  force(value: boolean): this {
    this.forceFlag = value;
    return this;
  }

  flatten(value: boolean): this {
    this.flattenFlag = value;
    return this;
  }

  include(...patterns: string[]): this {
    this.includePatterns.push(...patterns);
    return this;
  }

  exclude(...patterns: string[]): this {
    this.excludePatterns.push(...patterns);
    return this;
  }

  rename(pattern: RegExp, replacement: string): this {
    this.renamePattern = pattern;
    this.renameReplacement = replacement;
    return this;
  }

  validate() {
    if (!this.fromPath && !this.fileSet) {
      throw new Error("CopyTask: 'from' or 'files' is required");
    }
    if (!this.toPath) {
      throw new Error("CopyTask: 'to' is required");
    }
  }

  async execute() {
    if (this.fileSet) {
      console.log(`  ↳ Copying files from FileSet to ${this.toPath}`);
      await this.copyFromFileSet();
    } else {
      console.log(`  ↳ Copying ${this.fromPath} to ${this.toPath}`);

      if (this.renamePattern) {
        // Need to rename files during copy
        await this.copyWithRename();
      } else if (this.flattenFlag) {
        await this.copyFlattened();
      } else if (this.includePatterns.length === 0 && this.excludePatterns.length === 0) {
        // Fast path: no filtering needed
        await cp(this.fromPath!, this.toPath!, {
          recursive: this.recursiveFlag,
          force: this.forceFlag,
        });
      } else {
        // Need to filter files based on include/exclude patterns
        await this.copyWithFilters();
      }
    }
  }

  private async copyFlattened() {
    // Ensure destination directory exists
    await mkdir(this.toPath!, { recursive: true });

    // Get all files (expand globs)
    const files = await glob(this.fromPath!, {
      nodir: true,
      absolute: true,
    });

    // Copy each file to destination root
    for (const srcFile of files) {
      const filename = basename(srcFile);
      const destFile = join(this.toPath!, filename);
      await copyFile(srcFile, destFile);
    }
  }

  private async copyWithFilters() {
    const { readdir, stat, mkdir, copyFile } = await import("fs/promises");

    // Get all files to copy
    const allFiles = await glob(`${this.fromPath}/**/*`, {
      nodir: false,
      dot: true,
    });

    // Filter files based on include/exclude patterns
    const filesToCopy = allFiles.filter(file => {
      const relativePath = relative(this.fromPath!, file);
      return this.shouldIncludeFile(relativePath);
    });

    // Copy each file
    for (const srcFile of filesToCopy) {
      const relativePath = relative(this.fromPath!, srcFile);
      const destFile = join(this.toPath!, relativePath);

      const stats = await stat(srcFile);
      if (stats.isDirectory()) {
        await mkdir(destFile, { recursive: true });
      } else {
        await mkdir(dirname(destFile), { recursive: true });
        await copyFile(srcFile, destFile);
      }
    }
  }

  private async copyWithRename() {
    const { basename, dirname: pathDirname, resolve } = await import("path");
    const { mkdir, copyFile } = await import("fs/promises");

    // Determine if fromPath is a glob pattern or a directory
    const isGlobPattern = this.fromPath!.includes("*");

    // Get all files to copy
    const globPattern = isGlobPattern
      ? this.fromPath!
      : `${this.fromPath}/**/*`;

    const allFiles = await glob(globPattern, {
      nodir: true,
      absolute: true,
      dot: true,
    });

    // Determine the base directory for relative path calculation
    const baseDir = isGlobPattern
      ? this.fromPath!.split("*")[0].replace(/\/$/, "")
      : this.fromPath!;

    for (const srcFile of allFiles) {
      // Calculate relative path from base directory
      const relativeFromBase = relative(baseDir, srcFile);

      // Check if file should be included based on include/exclude patterns
      if (!this.shouldIncludeFile(relativeFromBase)) {
        continue;
      }

      // Apply rename pattern to the filename
      const filename = basename(srcFile);
      const newFilename = filename.replace(
        this.renamePattern!,
        this.renameReplacement!
      );

      // Determine destination path, preserving directory structure
      const relativeDir = pathDirname(relativeFromBase);
      const destFile = relativeDir === "." || relativeDir === ""
        ? join(this.toPath!, newFilename)
        : join(this.toPath!, relativeDir, newFilename);

      // Ensure destination directory exists
      await mkdir(pathDirname(destFile), { recursive: true });

      // Copy file
      await copyFile(srcFile, destFile);

      // Log rename if filename changed
      if (newFilename !== filename) {
        console.log(`    ${filename} → ${newFilename}`);
      }
    }
  }

  private shouldIncludeFile(relativePath: string): boolean {
    // If include patterns are specified, file must match at least one
    if (this.includePatterns.length > 0) {
      const matchesInclude = this.includePatterns.some(pattern =>
        minimatch(relativePath, pattern)
      );
      if (!matchesInclude) {
        return false;
      }
    }

    // File must not match any exclude patterns
    const matchesExclude = this.excludePatterns.some(pattern =>
      minimatch(relativePath, pattern)
    );
    return !matchesExclude;
  }

  private async copyFromFileSet() {
    const files = await this.fileSet!.resolve();
    const baseDir = this.fileSet!.getBaseDir();

    for (const file of files) {
      const relativePath = relative(baseDir, file);
      const destPath = join(this.toPath!, relativePath);

      await mkdir(dirname(destPath), { recursive: true });
      await copyFile(file, destPath);
    }
  }
}
