import { Task } from "@worklift/core";
import { rename, mkdir } from "fs/promises";
import { relative, join, dirname, basename } from "path";
import { FileSet } from "./FileSet.ts";

/**
 * Task for moving/renaming files or directories.
 * Use FileSet for moving multiple files.
 */
export class MoveTask extends Task {
  private fromPath?: string;
  private fileSet?: FileSet;
  private toPath?: string;
  private flattenFlag = false;

  inputs?: string | string[];
  outputs?: string | string[];

  static from(path: string): MoveTask {
    const task = new MoveTask();
    task.fromPath = path;
    task.inputs = path;
    return task;
  }

  static files(fileSet: FileSet): MoveTask {
    const task = new MoveTask();
    task.fileSet = fileSet;
    return task;
  }

  to(path: string): this {
    this.toPath = path;
    this.outputs = path;
    return this;
  }

  flatten(value: boolean): this {
    this.flattenFlag = value;
    return this;
  }

  validate() {
    if (!this.fromPath && !this.fileSet) {
      throw new Error("MoveTask: 'from' or 'files' is required");
    }
    if (!this.toPath) {
      throw new Error("MoveTask: 'to' is required");
    }
  }

  async execute() {
    if (this.fileSet) {
      console.log(`  ↳ Moving files from FileSet to ${this.toPath}`);
      await this.moveFromFileSet();
    } else {
      console.log(`  ↳ Moving ${this.fromPath} to ${this.toPath}`);
      await rename(this.fromPath!, this.toPath!);
    }
  }

  private async moveFromFileSet() {
    const files = await this.fileSet!.resolve();
    const baseDir = this.fileSet!.getBaseDir();

    // Ensure destination directory exists
    await mkdir(this.toPath!, { recursive: true });

    for (const file of files) {
      let destPath: string;

      if (this.flattenFlag) {
        // Flatten: move all files to destination root
        const filename = basename(file);
        destPath = join(this.toPath!, filename);
      } else {
        // Preserve directory structure
        const relativePath = relative(baseDir, file);
        destPath = join(this.toPath!, relativePath);
        await mkdir(dirname(destPath), { recursive: true });
      }

      await rename(file, destPath);
    }
  }
}
