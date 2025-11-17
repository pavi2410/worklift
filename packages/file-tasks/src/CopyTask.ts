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

    if (this.excludePatterns.length === 0) {
      // Fast path: no filtering needed
      await cp(this.fromPath!, this.toPath!, {
        recursive: this.recursiveFlag,
        force: this.forceFlag,
      });
    } else {
      // Need to filter excluded files
      await this.copyWithExcludes();
    }
  }

  private async copyWithExcludes() {
    const { readdir, stat, mkdir, copyFile } = await import("fs/promises");

    // Get all files to copy
    const allFiles = await glob(`${this.fromPath}/**/*`, {
      nodir: false,
      dot: true,
    });

    // Filter out excluded files
    const filesToCopy = allFiles.filter(file => {
      const relativePath = relative(this.fromPath!, file);
      return !this.isExcluded(relativePath);
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

  private isExcluded(relativePath: string): boolean {
    return this.excludePatterns.some(pattern =>
      minimatch(relativePath, pattern)
    );
  }
}
