import { Task } from "@worklift/core";
import { rm } from "fs/promises";
import { glob } from "glob";
import { FileSet } from "./FileSet.ts";

/**
 * Task for deleting files or directories.
 * Use FileSet for complex file selection with include/exclude patterns.
 */
export class DeleteTask extends Task {
  private pathList?: string[];
  private patternList?: string[];
  private fileSet?: FileSet;
  private baseDirPath?: string;
  private recursiveFlag = true;
  private includeDirsFlag = false;

  inputs?: string | string[];
  outputs?: string | string[];

  static paths(...paths: string[]): DeleteTask {
    const task = new DeleteTask();
    task.pathList = paths;
    return task;
  }

  static patterns(...patterns: string[]): DeleteTask {
    const task = new DeleteTask();
    task.patternList = patterns;
    return task;
  }

  static files(fileSet: FileSet): DeleteTask {
    const task = new DeleteTask();
    task.fileSet = fileSet;
    return task;
  }

  baseDir(dir: string): this {
    this.baseDirPath = dir;
    return this;
  }

  recursive(value: boolean): this {
    this.recursiveFlag = value;
    return this;
  }

  includeDirs(value: boolean): this {
    this.includeDirsFlag = value;
    return this;
  }

  validate() {
    if (
      (!this.pathList || this.pathList.length === 0) &&
      (!this.patternList || this.patternList.length === 0) &&
      !this.fileSet
    ) {
      throw new Error("DeleteTask: 'paths', 'patterns', or 'files' is required");
    }
  }

  async execute() {
    // Delete explicit paths
    if (this.pathList && this.pathList.length > 0) {
      for (const path of this.pathList) {
        await rm(path, { recursive: this.recursiveFlag, force: true });
      }
    }

    // Delete files matching patterns
    if (this.patternList && this.patternList.length > 0) {
      await this.deleteMatchingPatterns();
    }

    // Delete files from FileSet
    if (this.fileSet) {
      await this.deleteFromFileSet();
    }
  }

  private async deleteMatchingPatterns() {
    const cwd = this.baseDirPath || process.cwd();

    for (const pattern of this.patternList!) {
      const matches = await glob(pattern, {
        cwd,
        nodir: !this.includeDirsFlag,
        absolute: true,
      });


      for (const file of matches) {
        await rm(file, {
          recursive: this.recursiveFlag,
          force: true,
        });
      }
    }
  }

  private async deleteFromFileSet() {
    const files = await this.fileSet!.resolve();

    for (const file of files) {
      await rm(file, {
        recursive: this.recursiveFlag,
        force: true,
      });
    }
  }
}
