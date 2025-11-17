import { Task } from "@worklift/core";
import { cp } from "fs/promises";
import { glob } from "glob";
import { relative, join, dirname } from "path";
import { minimatch } from "minimatch";

/**
 * Task for copying files or directories
 */
export class CopyTask extends Task {
  private fromPath?: string;
  private toPath?: string;
  private recursiveFlag = true;
  private forceFlag = true;
  private includePatterns: string[] = [];
  private excludePatterns: string[] = [];

  inputs?: string | string[];
  outputs?: string | string[];

  static from(path: string): CopyTask {
    const task = new CopyTask();
    task.fromPath = path;
    task.inputs = path;
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

  include(...patterns: string[]): this {
    this.includePatterns.push(...patterns);
    return this;
  }

  exclude(...patterns: string[]): this {
    this.excludePatterns.push(...patterns);
    return this;
  }

  validate() {
    if (!this.fromPath) {
      throw new Error("CopyTask: 'from' is required");
    }
    if (!this.toPath) {
      throw new Error("CopyTask: 'to' is required");
    }
  }

  async execute() {
    console.log(`  ↳ Copying ${this.fromPath} to ${this.toPath}`);

    if (this.includePatterns.length === 0 && this.excludePatterns.length === 0) {
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
}
