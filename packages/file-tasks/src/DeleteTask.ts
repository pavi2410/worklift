import { Task } from "@worklift/core";
import { rm } from "fs/promises";
import { glob } from "glob";
import { FileSet } from "./FileSet.ts";

/**
 * Configuration for DeleteTask
 */
export interface DeleteTaskConfig {
  /** Explicit paths to delete */
  paths?: string[];
  /** Glob patterns to match files for deletion */
  patterns?: string[];
  /** FileSet for complex file selection */
  files?: FileSet;
  /** Base directory for pattern matching */
  baseDir?: string;
  /** Delete directories recursively (default: true) */
  recursive?: boolean;
  /** Include directories when matching patterns (default: false) */
  includeDirs?: boolean;
}

/**
 * Task for deleting files or directories.
 *
 * @example
 * ```typescript
 * // Delete specific paths
 * DeleteTask.of({ paths: ["build", "dist"] })
 *
 * // Delete files matching patterns
 * DeleteTask.of({
 *   patterns: ["**\/*.tmp", "**\/*.bak"],
 *   baseDir: "build",
 * })
 *
 * // Delete with FileSet
 * DeleteTask.of({
 *   files: FileSet.from("build").include("**\/*.class"),
 * })
 * ```
 */
export class DeleteTask extends Task {
  private pathList: string[];
  private patternList: string[];
  private fileSet?: FileSet;
  private baseDirPath?: string;
  private recursiveFlag: boolean;
  private includeDirsFlag: boolean;

  constructor(config: DeleteTaskConfig = {}) {
    super();
    this.pathList = config.paths ?? [];
    this.patternList = config.patterns ?? [];
    this.fileSet = config.files;
    this.baseDirPath = config.baseDir;
    this.recursiveFlag = config.recursive ?? true;
    this.includeDirsFlag = config.includeDirs ?? false;
  }

  /**
   * Create a new DeleteTask with the given configuration.
   */
  static of(config: DeleteTaskConfig): DeleteTask {
    return new DeleteTask(config);
  }

  override validate() {
    if (
      this.pathList.length === 0 &&
      this.patternList.length === 0 &&
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
