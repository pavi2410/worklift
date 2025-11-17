import { Task } from "@worklift/core";
import { rm } from "fs/promises";
import { glob } from "glob";

/**
 * Task for deleting files or directories
 */
export class DeleteTask extends Task {
  private pathList?: string[];
  private patternList?: string[];
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
      (!this.patternList || this.patternList.length === 0)
    ) {
      throw new Error("DeleteTask: 'paths' or 'patterns' is required");
    }
  }

  async execute() {
    // Delete explicit paths (existing behavior)
    if (this.pathList && this.pathList.length > 0) {
      console.log(`  ↳ Deleting ${this.pathList.length} item(s)`);
      for (const path of this.pathList) {
        await rm(path, { recursive: this.recursiveFlag, force: true });
      }
    }

    // Delete files matching patterns (new behavior)
    if (this.patternList && this.patternList.length > 0) {
      await this.deleteMatchingPatterns();
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

      console.log(`  ↳ Deleting ${matches.length} file(s) matching ${pattern}`);

      for (const file of matches) {
        await rm(file, {
          recursive: this.recursiveFlag,
          force: true,
        });
      }
    }
  }
}
